from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class InventoryAdjustment(models.Model):
    """
    Inventory audit adjustments - records stock discrepancies found during physical counts.
    Created when real stock differs from system stock during audit imports.
    """
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.PROTECT,
        related_name='inventory_adjustments',
        help_text="Product being adjusted"
    )
    delta_ok = models.IntegerField(
        default=0,
        help_text="Change in OK stock (positive = increase, negative = decrease)"
    )
    delta_defect = models.IntegerField(
        default=0,
        help_text="Change in defective stock (positive = increase, negative = decrease)"
    )
    previous_ok = models.IntegerField(
        help_text="Stock OK before adjustment"
    )
    previous_defect = models.IntegerField(
        help_text="Stock defect before adjustment"
    )
    new_ok = models.IntegerField(
        help_text="Stock OK after adjustment"
    )
    new_defect = models.IntegerField(
        help_text="Stock defect after adjustment"
    )
    date = models.DateField(
        help_text="Date of physical audit"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='inventory_adjustments',
        help_text="User who performed the audit"
    )
    comment = models.TextField(
        blank=True,
        help_text="Optional notes about the adjustment"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['date']),
            models.Index(fields=['product', '-created_at']),
        ]

    def __str__(self) -> str:
        product_name = getattr(self.product, 'name', 'Unknown product')
        return f"{product_name} adjustment on {self.date} (OK: {self.delta_ok:+d}, Defect: {self.delta_defect:+d})"

    @property
    def total_delta(self) -> int:
        """Total stock change (OK + Defect)"""
        return self.delta_ok + self.delta_defect


class ReturnedProduct(models.Model):
    class ReturnType(models.TextChoices):
        GOOD = 'good', "Sog'lom"
        DEFECTIVE = 'defective', 'Nuqsonli'

    dealer = models.ForeignKey('dealers.Dealer', on_delete=models.SET_NULL, null=True, blank=True, related_name='returns')
    product = models.ForeignKey('catalog.Product', on_delete=models.SET_NULL, null=True, blank=True, related_name='returns')
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    return_type = models.CharField(max_length=20, choices=ReturnType.choices, default=ReturnType.GOOD)
    reason = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        dealer_name = getattr(self.dealer, 'name', 'Unknown dealer')
        product_name = getattr(self.product, 'name', 'Unknown product')
        return f"{product_name} — {dealer_name} ({self.quantity})"
