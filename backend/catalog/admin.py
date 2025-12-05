from django.contrib import admin

from .models import Brand, Category, Product, ProductModel, ProductSKU, ProductVariant, Style


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active',)


@admin.register(ProductModel)
class ProductModelAdmin(admin.ModelAdmin):
    list_display = ('model_name', 'brand', 'collection', 'is_active', 'variants_count')
    list_filter = ('is_active', 'brand')
    search_fields = ('model_name', 'collection', 'brand__name')
    autocomplete_fields = ('brand',)
    
    fieldsets = (
        (None, {
            'fields': ('brand', 'collection', 'model_name')
        }),
        ('Media', {
            'fields': ('preview_image',)
        }),
        ('Additional Info', {
            'fields': ('description', 'is_active'),
            'classes': ('collapse',)
        }),
    )
    
    def variants_count(self, obj):
        return obj.variants.count()
    variants_count.short_description = 'Variants'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('brand')


class ProductSKUInline(admin.TabularInline):
    model = ProductSKU
    extra = 1
    autocomplete_fields = ('product',)
    fields = ('size', 'custom_size', 'product', 'price_display', 'stock_display')
    readonly_fields = ('price_display', 'stock_display')
    
    def price_display(self, obj):
        if obj.product:
            return f"${obj.product.sell_price_usd}"
        return "N/A"
    price_display.short_description = 'Price'
    
    def stock_display(self, obj):
        if obj.product:
            return int(obj.product.stock_ok)
        return "N/A"
    stock_display.short_description = 'Stock'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Только продукты категории 'Дверное полотно'"""
        if db_field.name == "product":
            door_category = Category.objects.filter(name="Дверное полотно").first()
            if door_category:
                kwargs["queryset"] = Product.objects.filter(category=door_category, is_active=True).select_related('brand')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('variant_name', 'brand_display', 'collection_display', 'color', 'door_type', 'is_active', 'skus_count')
    list_filter = ('is_active', 'door_type', 'product_model__brand')
    search_fields = ('product_model__model_name', 'color', 'product_model__brand__name')
    autocomplete_fields = ('product_model',)
    inlines = [ProductSKUInline]
    
    fieldsets = (
        ('Model', {
            'fields': ('product_model',)
        }),
        ('Variant Details', {
            'fields': ('color', 'door_type', 'image')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    
    def variant_name(self, obj):
        return str(obj)
    variant_name.short_description = 'Variant'
    
    def brand_display(self, obj):
        return obj.brand_name
    brand_display.short_description = 'Brand'
    brand_display.admin_order_field = 'product_model__brand__name'
    
    def collection_display(self, obj):
        return obj.collection_name
    collection_display.short_description = 'Collection'
    collection_display.admin_order_field = 'product_model__collection'
    
    def skus_count(self, obj):
        return obj.skus.count()
    skus_count.short_description = 'SKUs'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('product_model__brand')


@admin.register(ProductSKU)
class ProductSKUAdmin(admin.ModelAdmin):
    list_display = ('sku_display', 'variant_display', 'size_display', 'product_sku', 'price_usd', 'stock_quantity')
    list_filter = ('size', 'variant__door_type', 'variant__product_model__brand')
    search_fields = ('product__sku', 'product__name', 'variant__product_model__model_name')
    autocomplete_fields = ('variant', 'product')
    
    fieldsets = (
        ('Variant', {
            'fields': ('variant',)
        }),
        ('Size', {
            'fields': ('size', 'custom_size')
        }),
        ('ERP Product Link', {
            'fields': ('product',),
            'description': 'Связь с существующим продуктом из ERP (orderlar, payments va boshqa ma\'lumotlar bu yerda)'
        }),
    )
    
    def sku_display(self, obj):
        return str(obj)
    sku_display.short_description = 'SKU'
    
    def variant_display(self, obj):
        return str(obj.variant)
    variant_display.short_description = 'Variant'
    variant_display.admin_order_field = 'variant'
    
    def size_display(self, obj):
        return obj.custom_size if obj.size == 'other' else obj.get_size_display()
    size_display.short_description = 'Size'
    
    def product_sku(self, obj):
        return obj.product.sku if obj.product else 'N/A'
    product_sku.short_description = 'Product SKU'
    product_sku.admin_order_field = 'product__sku'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('variant__product_model__brand', 'product')
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Только продукты категории 'Дверное полотно'"""
        if db_field.name == "product":
            door_category = Category.objects.filter(name="Дверное полотно").first()
            if door_category:
                kwargs["queryset"] = Product.objects.filter(category=door_category, is_active=True).select_related('brand')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'brand', 'category', 'sell_price_usd', 'stock_ok', 'is_active')
    list_filter = ('is_active', 'brand', 'category')
    search_fields = ('sku', 'name', 'barcode')
    autocomplete_fields = ('brand', 'category', 'style')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('brand', 'category', 'style')
