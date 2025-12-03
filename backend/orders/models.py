from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import DecimalField, F, Sum
from django.utils import timezone

from core.utils.order_numbers import generate_order_number
from payments.utils import rate_on

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

    display_no = models.CharField(max_length=32, unique=True, editable=False, blank=True)
    dealer = models.ForeignKey('dealers.Dealer', on_delete=models.CASCADE, related_name='orders')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_orders',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    value_date = models.DateField(default=timezone.localdate)
    total_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_uzs = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    is_reserve = models.BooleanField(default=False)
    is_imported = models.BooleanField(default=False)

    class Meta:
        ordering = ('-created_at',)

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
        total = (
            self.items.aggregate(
                total=Sum(F('qty') * F('price_usd'), output_field=DecimalField(max_digits=14, decimal_places=2))
            )['total']
            or Decimal('0')
        )
        self.total_usd = total
        rate = rate_on(self.value_date)
        if rate:
            self.total_uzs = (total * rate.usd_to_uzs).quantize(Decimal('0.01'))
        else:
            self.total_uzs = Decimal('0')
        super().save(update_fields=('total_usd', 'total_uzs', 'updated_at'))


class OrderItem(models.Model):
    class ItemStatus(models.TextChoices):
        RESERVED = 'reserved', 'Reserved'
        SHIPPED = 'shipped', 'Shipped'
        RETURNED = 'returned', 'Returned'
        CANCELLED = 'cancelled', 'Cancelled'

    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT, related_name='order_items')
    qty = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    price_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=ItemStatus.choices, default=ItemStatus.RESERVED)

    class Meta:
        ordering = ('id',)

    def __str__(self) -> str:
        return f"{self.product} x{self.qty:.2f}"

    @property
    def line_total_usd(self) -> Decimal:
        qty = self.qty or Decimal('0')
        return (self.price_usd or Decimal('0')) * qty


class OrderStatusLog(models.Model):
    order = models.ForeignKey(Order, related_name='status_logs', on_delete=models.CASCADE)
    old_status = models.CharField(max_length=20, choices=Order.Status.choices, null=True, blank=True)
    new_status = models.CharField(max_length=20, choices=Order.Status.choices)
    by_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    at = models.DateTimeField(auto_now_add=True)

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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def save(self, *args, **kwargs):
        if not self.amount_usd:
            quantity = self.quantity or Decimal('0.00')
            self.amount_usd = (self.item.price_usd * quantity).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
