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


# ============================================================================
# VARIANT-BASED CATALOG MODELS (for "Дверное полотно" category)
# ============================================================================


class ProductModel(models.Model):
    """
    Модель продукта (Brand + Collection + Model Name).
    Пример: "ДУБРАВА СИБИРЬ Эмалит Бета Софт"
    """
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='product_models')
    collection = models.CharField(max_length=200, help_text="Коллекция (Эмалит, Вертикаль, 50001/50002)")
    model_name = models.CharField(max_length=200, help_text="Название модели (Бета Софт, Имидж Эмалит белый)")
    preview_image = models.ImageField(upload_to='catalog/models/', null=True, blank=True, help_text="Превью модели")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('brand__name', 'collection', 'model_name')
        unique_together = ('brand', 'collection', 'model_name')
        verbose_name = 'Product Model'
        verbose_name_plural = 'Product Models'

    def __str__(self) -> str:
        return f"{self.brand.name} {self.collection} - {self.model_name}"


class ProductVariant(models.Model):
    """
    Вариант продукта (Model + Color + Door Type).
    Это основная единица для каталога.
    Пример: "Бета Софт тач-серый ПГ"
    """
    
    class DoorType(models.TextChoices):
        PG = 'ПГ', 'ПГ (Полотно глухое)'
        PO = 'ПО', 'ПО (Полотно остеклённое)'
        PDO = 'ПДО', 'ПДО (Полотно частично остеклённое)'
        PDG = 'ПДГ', 'ПДГ (Полотно с декоративными элементами)'
    
    product_model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name='variants')
    color = models.CharField(max_length=150, help_text="Цвет/ранг (белый, кремовый, тач-серый, дуб грей)")
    door_type = models.CharField(max_length=10, choices=DoorType.choices)
    sku = models.CharField(max_length=100, unique=True, null=True, blank=True, help_text="SKU/Артикул варианта")
    image = models.ImageField(upload_to='catalog/variants/', null=True, blank=True, help_text="Основное изображение варианта")
    configurations = models.JSONField(default=list, blank=True, help_text="Комплектация: [{'name': '...', 'value': '...'}]")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('product_model', 'color', 'door_type')
        unique_together = ('product_model', 'color', 'door_type')
        verbose_name = 'Product Variant'
        verbose_name_plural = 'Product Variants'
        indexes = [
            models.Index(fields=['product_model', 'is_active']),
        ]

    def __str__(self) -> str:
        return f"{self.product_model.model_name} {self.color} {self.door_type}"
    
    @property
    def brand_name(self) -> str:
        return self.product_model.brand.name
    
    @property
    def collection_name(self) -> str:
        return self.product_model.collection
    
    @property
    def model_name(self) -> str:
        return self.product_model.model_name
    
    def get_min_price_usd(self):
        """Минимальная цена USD среди всех SKU этого варианта"""
        skus = self.skus.filter(product__is_active=True)
        if not skus.exists():
            return Decimal('0.00')
        return skus.aggregate(min_price=models.Min('product__sell_price_usd'))['min_price'] or Decimal('0.00')
    
    def get_min_price_uzs(self):
        """Минимальная цена UZS среди всех SKU этого варианта"""
        skus = self.skus.filter(product__is_active=True)
        if not skus.exists():
            return Decimal('0.00')
        # Calculate from USD price using latest exchange rate
        from finance.models import ExchangeRate
        min_price_usd = self.get_min_price_usd()
        rate = ExchangeRate.objects.order_by('-rate_date').first()
        if rate and min_price_usd:
            return (min_price_usd * rate.usd_to_uzs).quantize(Decimal('0.01'))
        return Decimal('0.00')
    
    def get_size_stock(self):
        """
        Возвращает список размеров и остатков для этого варианта.
        [
            {"size": "400мм", "stock": 0},
            {"size": "600мм", "stock": 3},
            {"size": "700мм", "stock": 12},
            {"size": "800мм", "stock": 5},
            {"size": "900мм", "stock": 0}
        ]
        """
        standard_sizes = ['400мм', '600мм', '700мм', '800мм', '900мм']
        size_stock = []
        
        for size in standard_sizes:
            sku = self.skus.filter(size=size, product__is_active=True).first()
            stock = int(sku.product.stock_ok) if sku and sku.product else 0
            size_stock.append({
                'size': size,
                'stock': stock
            })
        
        return size_stock
    
    # ============================================================================
    # DOOR KIT (KOMPLEKTATSIYA) METHODS
    # ============================================================================
    
    @property
    def min_price_usd(self):
        """
        Polotno minimal narxi (barcha SKUlar ichidan).
        Katalog uchun asosiy polotno narxi.
        """
        return self.get_min_price_usd()
    
    @property
    def kit_total_price_usd(self):
        """
        Komplektatsiya (pogonaj) narxlari yig'indisi.
        Har bir komponent: component.sell_price_usd * quantity
        """
        total = Decimal('0.00')
        
        for kit_item in self.kit_components.select_related('component'):
            component_price = kit_item.component.sell_price_usd or Decimal('0.00')
            quantity = Decimal(str(kit_item.quantity))
            total += component_price * quantity
        
        return total if total > 0 else None
    
    @property
    def full_set_price_usd(self):
        """
        To'liq komplekt narxi: polotno + komplektatsiya.
        Bu narx katalogda "итого" sifatida ko'rsatiladi.
        """
        polotno_price = self.min_price_usd or Decimal('0.00')
        kit_price = self.kit_total_price_usd or Decimal('0.00')
        total = polotno_price + kit_price
        
        return total if total > 0 else None
    
    @property
    def max_full_sets_by_stock(self):
        """
        Skladdagi pogonaj komponentlari bo'yicha 
        nechta to'liq eshik komplekti yig'ish mumkinligini hisoblaydi.
        
        Har bir komponent uchun: floor(component_stock / required_quantity)
        va minimal qiymat olinadi.
        """
        if not self.kit_components.exists():
            return None
        
        ratios = []
        
        for kit_item in self.kit_components.select_related('component'):
            component = kit_item.component
            stock = component.stock_ok or Decimal('0.00')
            quantity = kit_item.quantity
            
            if quantity <= 0:
                continue
            
            # Nechta komplekt chiqishi mumkin
            ratio = int(stock // quantity)
            ratios.append(ratio)
        
        return min(ratios) if ratios else None


class DoorKitComponent(models.Model):
    """
    Eshik komplektatsiyasiga kiradigan komponent (погонаж).
    Har bir ProductVariant uchun qo'lda belgilanadi.
    
    Misol: "Бета Софт тач-серый ПГ" uchun:
    - 2.5 ta Наличник 70мм Лофт белый
    - 2.5 ta Коробка 100мм Лофт белый
    - 1.0 ta Добор 100мм Лофт белый
    """
    variant = models.ForeignKey(
        'ProductVariant',
        on_delete=models.CASCADE,
        related_name='kit_components',
        verbose_name="Вариант двери"
    )
    component = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        limit_choices_to={'is_active': True},
        verbose_name="Компонент",
        help_text="Погонаж: наличник, коробка, добор и т.д."
    )
    quantity = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name="Количество",
        help_text="Количество на 1 дверь (например, 2.50)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Комплектующий элемент двери"
        verbose_name_plural = "Комплектующие элементы двери"
        ordering = ('variant', 'component')
        indexes = [
            models.Index(fields=['variant']),
        ]

    def __str__(self) -> str:
        return f"{self.variant} → {self.component.name} × {self.quantity}"
    
    @property
    def total_price_usd(self):
        """Bu komponentning umumiy narxi (price * quantity)"""
        component_price = self.component.sell_price_usd or Decimal('0.00')
        return component_price * self.quantity


class ProductSKU(models.Model):
    """
    SKU продукта (Variant + Size).
    Связывает вариант с реальным Product из ERP.
    Пример: "Бета Софт тач-серый ПГ 800мм" → Product ID 123
    """
    
    class SizeChoices(models.TextChoices):
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
    
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='skus')
    size = models.CharField(max_length=20, choices=SizeChoices.choices)
    custom_size = models.CharField(max_length=100, blank=True, help_text="Если размер не из списка")
    
    # Связь с реальным Product из ERP (не изменяем существующие данные!)
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='catalog_sku',
        help_text="Существующий продукт из ERP (orderlar, to'lovlar va boshqa ma'lumotlar bu yerda)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('variant', 'size')
        unique_together = ('variant', 'size')
        verbose_name = 'Product SKU'
        verbose_name_plural = 'Product SKUs'
        indexes = [
            models.Index(fields=['variant', 'size']),
            models.Index(fields=['product']),
        ]

    def __str__(self) -> str:
        size_display = self.custom_size if self.size == 'other' else self.get_size_display()
        return f"{self.variant} {size_display} → {self.product.sku}"
    
    @property
    def price_usd(self):
        """Цена USD из связанного Product"""
        return self.product.sell_price_usd
    
    @property
    def cost_usd(self):
        """Себестоимость USD из связанного Product"""
        return self.product.cost_usd
    
    @property
    def stock_quantity(self):
        """Остаток из связанного Product"""
        return self.product.stock_ok
    
    @property
    def sku_code(self):
        """SKU код из связанного Product"""
        return self.product.sku
