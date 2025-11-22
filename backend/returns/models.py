from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from catalog.models import Product
from dealers.models import Dealer


class Return(models.Model):
    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Confirmed'

    dealer = models.ForeignKey(Dealer, on_delete=models.PROTECT, related_name='return_documents')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_returns',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    general_comment = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    total_sum = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        dealer_name = getattr(self.dealer, 'name', 'Unknown dealer')
        return f"Return for {dealer_name} ({self.created_at.date()})"


class ReturnItem(models.Model):
    class Status(models.TextChoices):
        HEALTHY = 'healthy', 'Healthy'
        DEFECT = 'defect', 'Defect'

    return_document = models.ForeignKey(Return, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.HEALTHY)
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('return_document', 'product')

    def __str__(self):
        return f"{self.product.name} x {self.quantity} ({self.status})"
