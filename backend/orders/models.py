from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import DecimalField, F, Sum
from django.utils import timezone

from core.utils.order_numbers import generate_order_number
from payments.utils import rate_on


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

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        return self.display_no

    def save(self, *args, **kwargs):
        if isinstance(self.value_date, datetime):
            self.value_date = self.value_date.date()
        if not self.display_no:
            today_count = Order.objects.filter(created_at__date=timezone.now().date()).count() + 1
            self.display_no = generate_order_number(sequence=today_count, order_date=self.value_date)
        super().save(*args, **kwargs)

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
    qty = models.PositiveIntegerField()
    price_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=ItemStatus.choices, default=ItemStatus.RESERVED)

    class Meta:
        ordering = ('id',)

    def __str__(self) -> str:
        return f"{self.product} x{self.qty}"

    @property
    def line_total_usd(self) -> Decimal:
        return (self.price_usd or Decimal('0')) * Decimal(self.qty)


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
    quantity = models.PositiveIntegerField()
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
            self.amount_usd = (self.item.price_usd * Decimal(self.quantity)).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
