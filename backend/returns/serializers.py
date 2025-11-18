from rest_framework import serializers
from django.db import transaction

from .models import Return, ReturnItem
from orders.models import Order, OrderItem
from catalog.models import Product

class ReturnItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField()

    class Meta:
        model = ReturnItem
        fields = ('product_id', 'quantity', 'comment')

class ReturnSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True)
    order_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Return
        fields = ('id', 'order_id', 'comment', 'items', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate(self, data):
        order_id = data['order_id']
        items_data = data['items']

        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            raise serializers.ValidationError({'order_id': 'Order not found.'})

        if not items_data:
            raise serializers.ValidationError({'items': 'At least one item is required.'})

        product_ids = [item['product_id'] for item in items_data]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError({'items': 'Duplicate products are not allowed.'})

        order_items = order.items.filter(product_id__in=product_ids).in_bulk(field_name='product_id')

        for item_data in items_data:
            product_id = item_data['product_id']
            quantity = item_data['quantity']

            if product_id not in order_items:
                raise serializers.ValidationError({f'items[{product_id}]': f'Product not found in this order.'})

            order_item = order_items[product_id]
            if quantity > order_item.qty:
                raise serializers.ValidationError({f'items[{product_id}]': f'Return quantity ({quantity}) cannot exceed ordered quantity ({order_item.qty}).'})

        data['order'] = order
        return data

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = validated_data.pop('order')
        
        return_instance = Return.objects.create(
            order=order,
            created_by=self.context['request'].user,
            **validated_data
        )

        for item_data in items_data:
            product_id = item_data.pop('product_id')
            product = Product.objects.get(pk=product_id)
            
            # Create ReturnItem
            ReturnItem.objects.create(
                return_document=return_instance,
                product=product,
                **item_data
            )

            # Adjust stock
            product.stock += item_data['quantity']
            product.save(update_fields=['stock'])

        return return_instance
