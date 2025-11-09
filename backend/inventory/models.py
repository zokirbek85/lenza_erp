from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


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
