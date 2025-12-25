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
            'stock_ok', 'unit', 'price_usd'
        ]
        read_only_fields = fields


# ==================== CART SERIALIZERS ====================

class DealerCartItemSerializer(serializers.ModelSerializer):
    """Serializer for cart items."""
    product_id = serializers.IntegerField(write_only=True, required=False)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_price = serializers.DecimalField(
        source='product.price_usd',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    product_stock = serializers.DecimalField(
        source='product.stock_ok',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        from .models import DealerCartItem
        model = DealerCartItem
        fields = [
            'id', 'product_id', 'product', 'product_name', 'product_sku',
            'product_price', 'product_stock', 'product_unit',
            'quantity', 'subtotal', 'added_at', 'updated_at'
        ]
        read_only_fields = ['id', 'added_at', 'updated_at', 'product']

    def get_subtotal(self, obj):
        """Calculate subtotal for this item"""
        return obj.get_subtotal()

    def validate_quantity(self, value):
        """Validate quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Miqdor 0 dan katta bo'lishi kerak")
        return value

    def validate(self, attrs):
        """Validate cart item - check stock availability"""
        from catalog.models import Product

        # Get product - either from attrs or from instance
        if 'product_id' in attrs:
            try:
                product = Product.objects.get(id=attrs['product_id'])
                attrs['product'] = product
            except Product.DoesNotExist:
                raise serializers.ValidationError({'product_id': 'Mahsulot topilmadi'})
        elif self.instance:
            product = self.instance.product
        else:
            raise serializers.ValidationError({'product_id': 'Mahsulot ko\'rsatilishi kerak'})

        # Check stock availability
        quantity = attrs.get('quantity', self.instance.quantity if self.instance else 0)
        if product.stock_ok < quantity:
            raise serializers.ValidationError({
                'quantity': f"Omborda yetarli mahsulot yo'q. Mavjud: {product.stock_ok} {product.unit}"
            })

        return attrs


class DealerCartSerializer(serializers.ModelSerializer):
    """Serializer for dealer cart with items."""
    items = DealerCartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        from .models import DealerCart
        model = DealerCart
        fields = [
            'id', 'dealer', 'items', 'total_items', 'total_quantity',
            'total_amount', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'dealer', 'created_at', 'updated_at']

    def get_total_items(self, obj):
        """Get total number of unique items"""
        return obj.get_total_items()

    def get_total_quantity(self, obj):
        """Get total quantity of all items"""
        return float(obj.get_total_quantity())

    def get_total_amount(self, obj):
        """Calculate total cart amount in USD"""
        return float(sum(item.get_subtotal() for item in obj.items.all()))


class AddToCartSerializer(serializers.Serializer):
    """Serializer for adding product to cart."""
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=True,
        min_value=0.01
    )

    def validate_product_id(self, value):
        """Validate product exists"""
        from catalog.models import Product
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Mahsulot topilmadi")
        return value

    def validate(self, attrs):
        """Validate stock availability"""
        from catalog.models import Product

        product = Product.objects.get(id=attrs['product_id'])
        if product.stock_ok < attrs['quantity']:
            raise serializers.ValidationError({
                'quantity': f"Omborda yetarli mahsulot yo'q. Mavjud: {product.stock_ok} {product.unit}"
            })

        return attrs
