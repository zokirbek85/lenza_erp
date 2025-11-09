from decimal import Decimal

from django.db import models

from core.utils.barcodes import generate_barcode


class Brand(models.Model):
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ('name',)

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    dealer = models.ForeignKey('dealers.Dealer', on_delete=models.SET_NULL, null=True, related_name='products')
    size = models.CharField(max_length=64, blank=True)
    unit = models.CharField(max_length=32, default='pcs')
    cost_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sell_price_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_ok = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    stock_defect = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    barcode = models.CharField(max_length=32, unique=True, editable=False, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return f"{self.sku} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.barcode:
            self.barcode = generate_barcode()
        super().save(*args, **kwargs)
