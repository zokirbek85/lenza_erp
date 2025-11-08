from django.db import transaction
from rest_framework import serializers

from catalog.serializers import ProductSerializer

from .models import Order, OrderItem, OrderReturn, OrderStatusLog


class OrderItemSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_detail', 'qty', 'price_usd', 'status')
        read_only_fields = ('status',)


class OrderStatusLogSerializer(serializers.ModelSerializer):
    by_user = serializers.StringRelatedField()

    class Meta:
        model = OrderStatusLog
        fields = ('id', 'old_status', 'new_status', 'by_user', 'at')


class OrderReturnSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderReturn
        fields = ('id', 'item', 'quantity', 'is_defect', 'amount_usd', 'created_at')
        read_only_fields = ('amount_usd', 'created_at')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    status_logs = OrderStatusLogSerializer(many=True, read_only=True)
    returns = OrderReturnSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id',
            'display_no',
            'dealer',
            'created_by',
            'status',
            'note',
            'created_at',
            'updated_at',
            'value_date',
            'total_usd',
            'total_uzs',
            'is_reserve',
            'items',
            'status_logs',
            'returns',
        )
        read_only_fields = ('display_no', 'created_by', 'created_at', 'updated_at', 'total_usd', 'total_uzs')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        user = self.context['request'].user
        with transaction.atomic():
            order = Order.objects.create(created_by=user, **validated_data)
            self._sync_items(order, items_data)
            order.recalculate_totals()
        return order

    def update(self, instance, validated_data):
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

    def _sync_items(self, order, items_data):
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
