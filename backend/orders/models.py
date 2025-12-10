from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import DecimalField, F, Sum
from django.utils import timezone

from core.utils.order_numbers import generate_order_number

# Warehouse uchun qat'iy ketma-ketlik
WAREHOUSE_FLOW = {
    'confirmed': 'packed',
    'packed': 'shipped',
    'shipped': 'delivered',
    'delivered': 'returned',
}


class Order(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', 'Created'
        CONFIRMED = 'confirmed', 'Confirmed'
        PACKED = 'packed', 'Packed'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'
        RETURNED = 'returned', 'Returned'

        @classmethod
        def active_statuses(cls) -> tuple[str, ...]:
            return (cls.CONFIRMED, cls.PACKED, cls.SHIPPED, cls.DELIVERED)

    display_no = models.CharField(
        max_length=32,
        unique=True,
        editable=False,
        blank=True,
        verbose_name="Order number",
        help_text="Auto-generated unique order display number"
    )
    dealer = models.ForeignKey(
        'dealers.Dealer',
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name="Dealer",
        help_text="Customer/dealer who placed this order"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_orders',
        verbose_name="Created by",
        help_text="User who created this order"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
        verbose_name="Order status",
        help_text="Current status of the order"
    )
    note = models.TextField(
        blank=True,
        verbose_name="Notes",
        help_text="Additional notes or comments about the order"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created at",
        help_text="Timestamp when order was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
        help_text="Timestamp of last update"
    )
    value_date = models.DateField(
        default=timezone.localdate,
        verbose_name="Value date",
        help_text="Date for financial accounting"
    )
    total_usd = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Total (USD)",
        help_text="Total order amount in USD"
    )
    total_uzs = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
        verbose_name="Total (UZS)",
        help_text="Total order amount in UZS"
    )
    exchange_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Exchange rate",
        help_text="Exchange rate used for this order (1 USD = X UZS)"
    )
    exchange_rate_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Exchange rate date",
        help_text="Date when exchange rate was applied"
    )
    is_reserve = models.BooleanField(
        default=False,
        verbose_name="Reserve order",
        help_text="Whether this is a reserve order"
    )
    is_imported = models.BooleanField(
        default=False,
        verbose_name="Imported",
        help_text="Whether this order was imported from external source"
    )
    
    # Discount fields
    discount_type = models.CharField(
        max_length=20,
        choices=[
            ('none', 'None'),
            ('percentage', 'Percentage'),
            ('amount', 'Fixed Amount')
        ],
        default='none',
        verbose_name="Discount Type",
        help_text="Type of discount applied to this order"
    )
    discount_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Discount Value",
        help_text="Discount value: percentage (0-100) or fixed amount in USD"
    )
    discount_amount_usd = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Discount Amount (USD)",
        help_text="Calculated discount amount in USD"
    )
    discount_amount_uzs = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
        verbose_name="Discount Amount (UZS)",
        help_text="Calculated discount amount in UZS"
    )

    class Meta:
        ordering = ('-created_at',)
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self) -> str:
        return self.display_no

    def save(self, *args, **kwargs):
        if isinstance(self.value_date, datetime):
            self.value_date = self.value_date.date()
        if not self.display_no:
            prefix = f"ORD-{self.value_date:%d.%m.%Y}-"
            last_display = (
                Order.objects.filter(value_date=self.value_date, display_no__startswith=prefix)
                .order_by('-display_no')
                .values_list('display_no', flat=True)
                .first()
            )
            last_sequence = int(last_display.split('-')[-1]) if last_display else 0
            next_sequence = last_sequence + 1
            candidate = generate_order_number(next_sequence, self.value_date)
            # Safeguard against race conditions by bumping sequence until unused.
            while Order.objects.filter(display_no=candidate).exists():
                next_sequence += 1
                candidate = generate_order_number(next_sequence, self.value_date)
            self.display_no = candidate
        super().save(*args, **kwargs)

    def can_edit_items(self, user) -> bool:
        """
        Determine if user can edit order items (add/remove/modify products).
        - Admin/Accountant: always can edit items
        - Manager (sales): only if status == CREATED
        - Other roles: no edit permission
        """
        if not user or not hasattr(user, 'role'):
            return False
        
        # Admin and accountant can always edit items
        if user.role in ['admin', 'accountant', 'owner']:
            return True
        
        # Manager (sales) can only edit items in CREATED orders
        if user.role == 'sales' and self.status == self.Status.CREATED:
            return True
        
        return False

    def can_change_status(self, user, new_status: str = None) -> bool:
        """
        Determine if user can change order status.
        - Admin/Accountant/Owner: always can change to any status
        - Manager (sales): only for orders they created, can change to any status
        - Warehouse: only can change following strict workflow (confirmed→packed→shipped→delivered→returned)
        - Other roles: no permission
        """
        if not user or not hasattr(user, 'role'):
            return False
        
        # Admin, accountant and owner can always change to any status
        if user.role in ['admin', 'accountant', 'owner']:
            return True
        
        # Manager (sales) can change status only for their own orders, no status restriction
        if user.role == 'sales' and self.created_by_id == user.id:
            return True
        
        # Warehouse can only follow strict workflow
        if user.role == 'warehouse':
            # If new_status provided, validate it's the next allowed step
            if new_status:
                allowed_next_status = WAREHOUSE_FLOW.get(self.status)
                return allowed_next_status == new_status
            # If no new_status, just check if current status has a next step
            return self.status in WAREHOUSE_FLOW
        
        return False
    
    def get_allowed_next_statuses(self, user) -> list[str]:
        """
        Get list of statuses user can change to from current status.
        - Admin/Accountant/Owner: all statuses
        - Manager: all statuses (for own orders)
        - Warehouse: only next step in workflow
        """
        if not user or not hasattr(user, 'role'):
            return []
        
        # Admin, accountant, owner - all statuses
        if user.role in ['admin', 'accountant', 'owner']:
            return list(self.Status.values)
        
        # Manager - all statuses for own orders
        if user.role == 'sales' and self.created_by_id == user.id:
            return list(self.Status.values)
        
        # Warehouse - only next step
        if user.role == 'warehouse':
            next_status = WAREHOUSE_FLOW.get(self.status)
            return [next_status] if next_status else []
        
        return []

    def recalculate_totals(self):
        """
        Recalculate order totals in USD and UZS with discount.
        Uses exchange rate from value_date if not already set.
        """
        from core.utils.currency import get_exchange_rate
        
        # Calculate subtotal (items sum without discount)
        subtotal = (
            self.items.aggregate(
                total=Sum(F('qty') * F('price_usd'), output_field=DecimalField(max_digits=14, decimal_places=2))
            )['total']
            or Decimal('0')
        )
        
        # Calculate discount
        discount_usd = Decimal('0')
        if self.discount_type == 'percentage':
            # Percentage discount: value is between 0-100
            percentage = min(max(self.discount_value, Decimal('0')), Decimal('100'))
            discount_usd = (subtotal * percentage / Decimal('100')).quantize(Decimal('0.01'))
        elif self.discount_type == 'amount':
            # Fixed amount discount in USD
            discount_usd = min(self.discount_value, subtotal)  # Can't be more than subtotal
            discount_usd = discount_usd.quantize(Decimal('0.01'))
        
        self.discount_amount_usd = discount_usd
        
        # Final total = subtotal - discount
        self.total_usd = subtotal - discount_usd
        
        # Get or use existing exchange rate
        if not self.exchange_rate:
            rate, rate_date = get_exchange_rate(self.value_date)
            self.exchange_rate = rate
            self.exchange_rate_date = rate_date
        
        # Calculate UZS amounts using stored exchange rate
        self.discount_amount_uzs = (discount_usd * self.exchange_rate).quantize(Decimal('0.01'))
        self.total_uzs = (self.total_usd * self.exchange_rate).quantize(Decimal('0.01'))
        
        super().save(update_fields=(
            'total_usd', 'total_uzs', 
            'discount_amount_usd', 'discount_amount_uzs',
            'exchange_rate', 'exchange_rate_date', 
            'updated_at'
        ))


class OrderItem(models.Model):
    class ItemStatus(models.TextChoices):
        RESERVED = 'reserved', 'Reserved'
        SHIPPED = 'shipped', 'Shipped'
        RETURNED = 'returned', 'Returned'
        CANCELLED = 'cancelled', 'Cancelled'

    order = models.ForeignKey(
        Order,
        related_name='items',
        on_delete=models.CASCADE,
        verbose_name="Order",
        help_text="Order this item belongs to"
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.PROTECT,
        related_name='order_items',
        verbose_name="Product",
        help_text="Product ordered"
    )
    qty = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Quantity",
        help_text="Quantity ordered (must be greater than 0)"
    )
    price_usd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Price (USD)",
        help_text="Unit price in USD"
    )
    status = models.CharField(
        max_length=20,
        choices=ItemStatus.choices,
        default=ItemStatus.RESERVED,
        verbose_name="Item status",
        help_text="Current status of this order item"
    )

    class Meta:
        ordering = ('id',)
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self) -> str:
        return f"{self.product} x{self.qty:.2f}"

    @property
    def line_total_usd(self) -> Decimal:
        qty = self.qty or Decimal('0')
        return (self.price_usd or Decimal('0')) * qty


class OrderStatusLog(models.Model):
    order = models.ForeignKey(
        Order,
        related_name='status_logs',
        on_delete=models.CASCADE,
        verbose_name="Order",
        help_text="Order being tracked"
    )
    old_status = models.CharField(
        max_length=20,
        choices=Order.Status.choices,
        null=True,
        blank=True,
        verbose_name="Old status",
        help_text="Previous status before change"
    )
    new_status = models.CharField(
        max_length=20,
        choices=Order.Status.choices,
        verbose_name="New status",
        help_text="New status after change"
    )
    by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Changed by",
        help_text="User who changed the status"
    )
    at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Changed at",
        help_text="Timestamp of status change"
    )

    class Meta:
        verbose_name = "Order Status Log"
        verbose_name_plural = "Order Status Logs"

    class Meta:
        ordering = ('-at',)


class OrderReturn(models.Model):
    order = models.ForeignKey(Order, related_name='returns', on_delete=models.CASCADE)
    item = models.ForeignKey(OrderItem, related_name='returns', on_delete=models.CASCADE)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    is_defect = models.BooleanField(default=False)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_returns'
    )
    amount_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_uzs = models.DecimalField(
        max_digits=18, 
        decimal_places=2, 
        default=0,
        help_text='Return amount in UZS (using order exchange rate)'
    )
    exchange_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Exchange rate from order (1 USD = X UZS)'
    )
    exchange_rate_date = models.DateField(
        null=True,
        blank=True,
        help_text='Exchange rate date from order'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def save(self, *args, **kwargs):
        if not self.amount_usd:
            quantity = self.quantity or Decimal('0.00')
            self.amount_usd = (self.item.price_usd * quantity).quantize(Decimal('0.01'))
        
        # Get exchange rate from order if available
        if self.order and self.order.exchange_rate and not self.exchange_rate:
            self.exchange_rate = self.order.exchange_rate
            self.exchange_rate_date = self.order.exchange_rate_date
        
        # Calculate UZS amount using order's exchange rate
        if self.exchange_rate and self.exchange_rate > 0:
            self.amount_uzs = (self.amount_usd * self.exchange_rate).quantize(Decimal('0.01'))
        else:
            # Fallback: use current rate if order doesn't have rate
            from core.utils.currency import usd_to_uzs
            self.amount_uzs, self.exchange_rate = usd_to_uzs(self.amount_usd, self.order.value_date if self.order else None)
            if not self.exchange_rate_date and self.order:
                self.exchange_rate_date = self.order.value_date
        
        super().save(*args, **kwargs)
