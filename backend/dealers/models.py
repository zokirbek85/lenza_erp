from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum


class Region(models.Model):
    name = models.CharField(max_length=120, unique=True)
    manager_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='managed_regions',
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return self.name


class Dealer(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=32, unique=True)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, related_name='dealers')
    contact = models.CharField(max_length=255, blank=True)
    manager_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='managed_dealers',
        null=True,
        blank=True,
    )
    opening_balance_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    @property
    def balance_usd(self) -> Decimal:
        from orders.models import Order, OrderReturn
        from payments.models import Payment

        opening = self.opening_balance_usd or Decimal('0')

        orders_total = (
            Order.objects.filter(dealer=self, status__in=Order.Status.active_statuses())
            .aggregate(total=Sum('total_usd'))
            .get('total')
            or Decimal('0')
        )
        returns_total = (
            OrderReturn.objects.filter(order__dealer=self)
            .aggregate(total=Sum('amount_usd'))
            .get('total')
            or Decimal('0')
        )
        payments_total = (
            Payment.objects.filter(dealer=self)
            .aggregate(total=Sum('amount_usd'))
            .get('total')
            or Decimal('0')
        )

        return opening + orders_total - returns_total - payments_total
