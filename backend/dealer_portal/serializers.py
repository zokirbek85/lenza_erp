"""
Serializers for dealer portal API.
"""
from rest_framework import serializers
from dealers.models import Dealer
from orders.models import Order, OrderItem
from finance.models import FinanceTransaction
from returns.models import Return, ReturnItem
from orders.models import OrderReturn
from catalog.models import Product


class DealerLoginSerializer(serializers.Serializer):
    """Serializer for dealer login."""
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class DealerProfileSerializer(serializers.ModelSerializer):
    """Serializer for dealer profile information."""
    balance_usd = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    balance_uzs = serializers.DecimalField(
        source='balance_uzs_current_rate',
        max_digits=18,
        decimal_places=2,
        read_only=True
    )
    region_name = serializers.CharField(source='region.name', read_only=True)
    manager_name = serializers.CharField(source='manager_user.get_full_name', read_only=True)

    class Meta:
        model = Dealer
        fields = [
            'id', 'code', 'name', 'contact', 'phone', 'address',
            'region_name', 'manager_name', 'balance_usd', 'balance_uzs',
            'created_at'
        ]
        read_only_fields = fields


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items in dealer portal."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    line_total = serializers.DecimalField(
        source='line_total_usd',
        max_digits=14,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product_name', 'product_sku', 'qty',
            'price_at_time', 'currency', 'line_total', 'status'
        ]


class DealerOrderSerializer(serializers.ModelSerializer):
    """Serializer for orders in dealer portal."""
    items = OrderItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'display_no', 'status', 'note', 'created_at', 'updated_at',
            'value_date', 'total_usd', 'total_uzs', 'exchange_rate',
            'discount_type', 'discount_value', 'discount_amount_usd',
            'created_by_name', 'items', 'is_reserve'
        ]
        read_only_fields = fields


class DealerPaymentSerializer(serializers.ModelSerializer):
    """Serializer for dealer payments (finance transactions)."""
    account_name = serializers.CharField(source='account.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = FinanceTransaction
        fields = [
            'id', 'date', 'amount', 'currency', 'amount_usd', 'amount_uzs',
            'exchange_rate', 'comment', 'status', 'account_name',
            'created_by_name', 'created_at', 'approved_at'
        ]
        read_only_fields = fields


class ReturnItemSerializer(serializers.ModelSerializer):
    """Serializer for return items."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = ReturnItem
        fields = [
            'id', 'product_name', 'product_sku', 'quantity',
            'status', 'comment'
        ]


class DealerReturnSerializer(serializers.ModelSerializer):
    """Serializer for dealer returns."""
    items = ReturnItemSerializer(many=True, read_only=True, source='items_set')
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Return
        fields = [
            'id', 'created_at', 'general_comment', 'status',
            'total_sum', 'created_by_name', 'items'
        ]
        read_only_fields = fields


class OrderReturnSerializer(serializers.ModelSerializer):
    """Serializer for order-specific returns."""
    order_display_no = serializers.CharField(source='order.display_no', read_only=True)
    product_name = serializers.CharField(source='item.product.name', read_only=True)
    product_sku = serializers.CharField(source='item.product.sku', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)

    class Meta:
        model = OrderReturn
        fields = [
            'id', 'order_display_no', 'product_name', 'product_sku',
            'quantity', 'is_defect', 'amount_usd', 'amount_uzs',
            'exchange_rate', 'processed_by_name', 'created_at'
        ]
        read_only_fields = fields


class DealerProductSerializer(serializers.ModelSerializer):
    """Serializer for products in dealer portal - read-only view."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'category_name', 'brand_name',
            'stock_ok', 'unit'
        ]
        read_only_fields = fields
