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


class Style(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    style = models.ForeignKey('catalog.Style', on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    size = models.CharField(max_length=64, blank=True)
    unit = models.CharField(max_length=32, default='pcs')
    cost_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sell_price_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_ok = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    stock_defect = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    barcode = models.CharField(max_length=32, unique=True, editable=False, blank=True)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
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


class Collection(models.Model):
    """Коллекция дверей (напр. Классика, Модерн)"""
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return self.name


class DoorModel(models.Model):
    """Модель двери (напр. М1, М2, Венеция)"""
    name = models.CharField(max_length=150)
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='models')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ('collection', 'name')
        unique_together = ('collection', 'name')
        verbose_name = 'Door Model'
        verbose_name_plural = 'Door Models'

    def __str__(self) -> str:
        return f"{self.collection.name} - {self.name}"


class DoorColor(models.Model):
    """Цвет/ранг двери"""
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=50, blank=True, help_text="Цветовой код или артикул")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ('name',)
        verbose_name = 'Door Color'
        verbose_name_plural = 'Door Colors'

    def __str__(self) -> str:
        return self.name


class ProductMeta(models.Model):
    """
    Дополнительная мета-информация для продукта категории "Дверное полотно".
    Не затрагивает Product.name и существующие данные.
    """
    
    class DoorType(models.TextChoices):
        PG = 'ПГ', 'ПГ (Полотно глухое)'
        PO = 'ПО', 'ПО (Полотно остеклённое)'
        PDO = 'ПДО', 'ПДО (Полотно частично остеклённое)'
        PDG = 'ПДГ', 'ПДГ (Полотно с декоративными элементами)'
    
    class DoorSize(models.TextChoices):
        SIZE_400 = '400мм', '400мм'
        SIZE_600 = '600мм', '600мм'
        SIZE_700 = '700мм', '700мм'
        SIZE_800 = '800мм', '800мм'
        SIZE_900 = '900мм', '900мм'
        SIZE_20_6 = '20-6', '20-6'
        SIZE_20_7 = '20-7', '20-7'
        SIZE_20_8 = '20-8', '20-8'
        SIZE_20_9 = '20-9', '20-9'
        SIZE_21_6 = '21-6', '21-6'
        SIZE_21_7 = '21-7', '21-7'
        SIZE_21_8 = '21-8', '21-8'
        SIZE_21_9 = '21-9', '21-9'
        SIZE_OTHER = 'other', 'Другой размер'
    
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='meta', primary_key=True)
    
    # Catalog structure fields
    collection = models.ForeignKey(Collection, on_delete=models.SET_NULL, null=True, blank=True, related_name='product_metas')
    model = models.ForeignKey(DoorModel, on_delete=models.SET_NULL, null=True, blank=True, related_name='product_metas')
    color = models.ForeignKey(DoorColor, on_delete=models.SET_NULL, null=True, blank=True, related_name='product_metas')
    door_type = models.CharField(max_length=10, choices=DoorType.choices, blank=True)
    door_size = models.CharField(max_length=20, choices=DoorSize.choices, blank=True)
    
    # Optional: custom size if SIZE_OTHER
    custom_size = models.CharField(max_length=100, blank=True, help_text="Если размер не из списка")
    
    # Additional metadata
    notes = models.TextField(blank=True, help_text="Дополнительные заметки")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Product Metadata'
        verbose_name_plural = 'Product Metadata'
    
    def __str__(self) -> str:
        parts = []
        if self.collection:
            parts.append(self.collection.name)
        if self.model:
            parts.append(self.model.name)
        if self.color:
            parts.append(self.color.name)
        if self.door_type:
            parts.append(self.get_door_type_display())
        if self.door_size:
            parts.append(self.get_door_size_display())
        
        if parts:
            return f"{self.product.sku}: {' | '.join(parts)}"
        return f"{self.product.sku}: (не заполнено)"
