from decimal import Decimal

from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from catalog.models import Product
from catalog.serializers import ProductSerializer
from dealers.models import Dealer

from .models import Order, OrderItem, OrderReturn, OrderStatusLog


class OrderItemSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)
    qty = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.01'),
        coerce_to_string=False,
    )

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_detail', 'qty', 'price_usd', 'status')
        read_only_fields = ('status',)
    
    def validate(self, data):
        """Validate that product has sufficient good stock (stock_ok only)."""
        product_id = data.get('product')
        if product_id:
            try:
                product = Product.objects.get(id=product_id.id if hasattr(product_id, 'id') else product_id)
                # Only check stock_ok - defect stock is not used in order creation
                if product.stock_ok <= 0:
                    raise serializers.ValidationError({
                        'product': _('Ushbu mahsulot omborda qolmagan. Mavjud: 0')
                    })
            except Product.DoesNotExist:
                raise serializers.ValidationError({
                    'product': _('Mahsulot topilmadi.')
                })
        return data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and hasattr(request.user, 'role') and request.user.role == 'warehouse':
            data.pop('price_usd', None)
        return data


class OrderStatusLogSerializer(serializers.ModelSerializer):
    by_user = serializers.StringRelatedField()

    class Meta:
        model = OrderStatusLog
        fields = ('id', 'old_status', 'new_status', 'by_user', 'at')


class OrderReturnSerializer(serializers.ModelSerializer):
    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.01'),
        coerce_to_string=False,
    )

    class Meta:
        model = OrderReturn
        fields = ('id', 'item', 'quantity', 'is_defect', 'amount_usd', 'created_at')
        read_only_fields = ('amount_usd', 'created_at')

class DealerShortSerializer(serializers.ModelSerializer):
    region = serializers.CharField(source='region.name', read_only=True)

    class Meta:
        model = Dealer
        fields = ('id', 'name', 'region')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    status_logs = OrderStatusLogSerializer(many=True, read_only=True)
    returns = OrderReturnSerializer(many=True, read_only=True)
    dealer = DealerShortSerializer(read_only=True)
    dealer_id = serializers.PrimaryKeyRelatedField(
        queryset=Dealer.objects.all(),
        source='dealer',
        write_only=True,
        required=False,
        allow_null=True,
    )
    can_edit = serializers.SerializerMethodField()

    def get_can_edit(self, obj):
        """Return whether current user can edit this order."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_edit(request.user)
        return False

    class Meta:
        model = Order
        fields = (
            'id',
            'display_no',
            'dealer',
            'dealer_id',
            'created_by',
            'status',
            'note',
            'created_at',
            'updated_at',
            'value_date',
            'total_usd',
            'total_uzs',
            'is_reserve',
            'is_imported',
            'can_edit',
            'items',
            'status_logs',
            'returns',
        )
        read_only_fields = ('display_no', 'created_by', 'created_at', 'updated_at', 'total_usd', 'total_uzs', 'can_edit')

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            mutable = data.copy()
        else:
            mutable = dict(data)
        if 'dealer' in mutable and 'dealer_id' not in mutable:
            mutable['dealer_id'] = mutable['dealer']
        mutable.pop('dealer', None)
        return super().to_internal_value(mutable)

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        user = self.context['request'].user
        with transaction.atomic():
            order = Order.objects.create(created_by=user, **validated_data)
            self._sync_items(order, items_data)
            order.recalculate_totals()
        return order

    def update(self, instance, validated_data):
        """
        Update order - enforce permission checks.
        Manager can only edit CREATED orders.
        Admin/Accountant can edit any order.
        """
        user = self.context['request'].user
        
        # Double-check permission (should already be checked in view)
        if not instance.can_edit(user):
            raise serializers.ValidationError({
                'detail': 'Bu buyurtmani tahrirlash mumkin emas. Faqat "created" statusdagi buyurtmalarni tahrirlash mumkin.'
            })
        
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        with transaction.atomic():
            instance.save()
            if items_data is not None:
                instance.items.all().delete()
                self._sync_items(instance, items_data)
            instance.recalculate_totals()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and hasattr(request.user, 'role') and request.user.role == 'warehouse':
            # Remove price fields for warehouse users
            data.pop('total_usd', None)
            data.pop('total_uzs', None)
        return data

    def _sync_items(self, order, items_data):
        """Sync order items with stock validation (good stock only)."""
        for item in items_data:
            product = item.get('product')
            # Only validate stock_ok - defect stock is not used in order creation
            if product and hasattr(product, 'stock_ok') and product.stock_ok <= 0:
                raise serializers.ValidationError({
                    'items': _('Mahsulot "%(name)s" omborda mavjud emas.') % {'name': product.name}
                })
            OrderItem.objects.create(order=order, **item)
