from decimal import Decimal

from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from catalog.models import Product
from catalog.serializers import ProductSerializer
from dealers.models import Dealer

from orders.models import Order, OrderItem, OrderReturn, OrderStatusLog


class OrderItemSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)
    qty = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.01'),
        coerce_to_string=False,
    )
    effective_price = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_detail', 'qty', 'price_usd', 'price_at_time', 'currency', 'effective_price', 'status')
        read_only_fields = ('status', 'price_at_time', 'currency', 'effective_price')
    
    def get_effective_price(self, obj):
        """Return the price that should be used for calculations."""
        return float(obj.get_effective_price())
    
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
    exchange_rate = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = OrderReturn
        fields = (
            'id', 'item', 'quantity', 'is_defect', 
            'amount_usd', 'amount_uzs', 
            'exchange_rate', 'exchange_rate_date',
            'created_at'
        )
        read_only_fields = ('amount_usd', 'amount_uzs', 'exchange_rate', 'exchange_rate_date', 'created_at')

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
    can_change_status = serializers.SerializerMethodField()
    allowed_next_statuses = serializers.SerializerMethodField()
    currency_rate = serializers.SerializerMethodField()
    
    discount_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        default=0,
        coerce_to_string=False,
    )

    def get_currency_rate(self, obj):
        """Get USD to UZS exchange rate on order creation date."""
        from core.utils.currency import get_exchange_rate
        
        rate, _ = get_exchange_rate(obj.value_date)
        return float(rate)

    def get_can_edit(self, obj):
        """Return whether current user can edit order items."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_edit_items(request.user)
        return False

    def get_can_change_status(self, obj):
        """Return whether current user can change order status using FSM."""
        from orders.services.fsm import can_change_status
        
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        return can_change_status(obj, user)
    
    def get_allowed_next_statuses(self, obj):
        """Return list of statuses user can change to from current status using FSM."""
        from orders.services.fsm import get_allowed_next_statuses
        
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        return get_allowed_next_statuses(obj, user)

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
            'exchange_rate',
            'exchange_rate_date',
            'is_reserve',
            'is_imported',
            'discount_type',
            'discount_value',
            'discount_amount_usd',
            'discount_amount_uzs',
            'can_edit',
            'can_change_status',
            'allowed_next_statuses',
            'currency_rate',
            'items',
            'status_logs',
            'returns',
        )
        read_only_fields = ('display_no', 'created_by', 'created_at', 'updated_at', 'total_usd', 'total_uzs', 'discount_amount_usd', 'discount_amount_uzs', 'exchange_rate', 'exchange_rate_date', 'can_edit', 'can_change_status', 'allowed_next_statuses')

    def validate_discount_value(self, value):
        """Validate discount value based on discount type"""
        discount_type = self.initial_data.get('discount_type', 'none')
        
        if discount_type == 'percentage':
            if value < 0 or value > 100:
                raise serializers.ValidationError(
                    _('Foiz 0 dan 100 gacha bo\'lishi kerak.')
                )
        elif discount_type == 'amount':
            if value < 0:
                raise serializers.ValidationError(
                    _('Chegirma summasi manfiy bo\'lishi mumkin emas.')
                )
        
        return value

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
        Update order with FSM validation for status changes.
        Uses transaction-safe status transitions with locking.
        """
        from orders.services.fsm import apply_status_transition
        
        items_data = validated_data.pop('items', None)
        new_status = validated_data.pop('status', None)
        user = self.context.get('request').user if self.context.get('request') else None
        
        with transaction.atomic():
            # Lock order for update to prevent race conditions
            locked_instance = instance.__class__.objects.select_for_update().get(pk=instance.pk)
            
            # Update non-status fields
            for attr, value in validated_data.items():
                setattr(locked_instance, attr, value)
            
            # Apply status transition if requested (with FSM validation)
            if new_status and new_status != locked_instance.status:
                apply_status_transition(locked_instance, new_status, user)
            else:
                locked_instance.save()
            
            # Update items if provided
            if items_data is not None:
                locked_instance.items.all().delete()
                self._sync_items(locked_instance, items_data)
            
            locked_instance.recalculate_totals()
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
