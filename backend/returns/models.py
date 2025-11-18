from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal

class Return(models.Model):
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='returns_new')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_returns'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"Return for Order {self.order.display_no}"

class ReturnItem(models.Model):
    return_document = models.ForeignKey(Return, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('return_document', 'product')

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
