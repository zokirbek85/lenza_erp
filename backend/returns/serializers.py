from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from catalog.models import Product
from dealers.models import Dealer
from .models import Return, ReturnItem


class ReturnItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(write_only=True)
    brand_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    brand_name = serializers.CharField(source='product.brand.name', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)

    class Meta:
        model = ReturnItem
        fields = (
            'id',
            'product_id',
            'brand_id',
            'category_id',
            'product_name',
            'brand_name',
            'category_name',
            'quantity',
            'status',
            'comment',
        )
        read_only_fields = ('id', 'product_name', 'brand_name', 'category_name')


class ReturnSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True)
    dealer_name = serializers.CharField(source='dealer.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Return
        fields = (
            'id',
            'dealer',
            'dealer_name',
            'items',
            'general_comment',
            'status',
            'status_display',
            'total_sum',
            'created_at',
        )
        read_only_fields = ('id', 'status', 'status_display', 'total_sum', 'created_at', 'dealer_name')

    def validate(self, attrs):
        items = attrs.get('items') or []
        dealer = attrs.get('dealer')
        if not dealer:
            raise serializers.ValidationError({'dealer': 'Dealer is required.'})
        if not items:
            raise serializers.ValidationError({'items': 'At least one item is required.'})

        product_ids = [item['product_id'] for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError({'items': 'Duplicate products are not allowed.'})

        products = {p.id: p for p in Product.objects.filter(id__in=product_ids)}
        missing = [pid for pid in product_ids if pid not in products]
        if missing:
            raise serializers.ValidationError({'items': f"Products not found: {missing}"})

        for idx, item in enumerate(items):
            product = products[item['product_id']]
            quantity = item.get('quantity')
            status = item.get('status')
            brand_id = item.get('brand_id')
            category_id = item.get('category_id')
            if quantity is None or Decimal(quantity) <= 0:
                raise serializers.ValidationError({f'items[{idx}].quantity': 'Quantity must be greater than zero.'})
            if status not in ReturnItem.Status.values:
                raise serializers.ValidationError({f'items[{idx}].status': 'Invalid status.'})
            if brand_id and product.brand_id and brand_id != product.brand_id:
                raise serializers.ValidationError({f'items[{idx}].brand_id': 'Brand does not match selected product.'})
            if category_id and product.category_id and category_id != product.category_id:
                raise serializers.ValidationError({f'items[{idx}].category_id': 'Category does not match selected product.'})
            item['product'] = product
        attrs['items'] = items
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        dealer: Dealer = validated_data['dealer']
        total_sum = Decimal('0.00')

        for item in items_data:
            product: Product = item['product']
            qty = Decimal(item['quantity'])
            total_sum += (product.sell_price_usd or Decimal('0.00')) * qty

        return_obj = Return.objects.create(
            status=Return.Status.CONFIRMED,
            total_sum=total_sum,
            **validated_data,
            created_by=self.context['request'].user,
        )

        for item in items_data:
            product: Product = item['product']
            qty = Decimal(item['quantity'])
            status = item['status']
            ReturnItem.objects.create(
                return_document=return_obj,
                product=product,
                quantity=qty,
                status=status,
                comment=item.get('comment', ''),
            )
            if status == ReturnItem.Status.HEALTHY:
                product.stock_ok = (product.stock_ok or Decimal('0')) + qty
                product.save(update_fields=['stock_ok'])
            else:
                product.stock_defect = (product.stock_defect or Decimal('0')) + qty
                product.save(update_fields=['stock_defect'])

        if hasattr(dealer, 'debt_usd'):
            dealer.debt_usd = (dealer.debt_usd or Decimal('0.00')) - total_sum
            dealer.save(update_fields=['debt_usd'])

        return return_obj

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and hasattr(request.user, 'role') and request.user.role == 'warehouse':
            # Remove total_sum for warehouse users
            data.pop('total_sum', None)
        return data
