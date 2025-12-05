from django.contrib import admin

from .models import Brand, Category, Collection, DoorColor, DoorModel, Product, ProductMeta, Style


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


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active',)


@admin.register(DoorModel)
class DoorModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'collection', 'is_active')
    list_filter = ('is_active', 'collection')
    search_fields = ('name', 'collection__name')
    autocomplete_fields = ('collection',)


@admin.register(DoorColor)
class DoorColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    search_fields = ('name', 'code')
    list_filter = ('is_active',)


class ProductMetaInline(admin.StackedInline):
    model = ProductMeta
    extra = 0
    can_delete = True
    autocomplete_fields = ('collection', 'model', 'color')
    fields = (
        ('collection', 'model'),
        ('color', 'door_type'),
        ('door_size', 'custom_size'),
        'notes',
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'brand', 'category', 'sell_price_usd', 'stock_ok', 'is_active')
    list_filter = ('is_active', 'brand', 'category')
    search_fields = ('sku', 'name', 'barcode')
    autocomplete_fields = ('brand', 'category', 'style')
    inlines = [ProductMetaInline]
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('brand', 'category', 'style')


@admin.register(ProductMeta)
class ProductMetaAdmin(admin.ModelAdmin):
    list_display = ('product_sku', 'product_name', 'collection', 'model', 'color', 'door_type', 'door_size')
    list_filter = ('collection', 'door_type', 'door_size', 'color')
    search_fields = ('product__sku', 'product__name', 'model__name', 'color__name')
    autocomplete_fields = ('product', 'collection', 'model', 'color')
    
    fieldsets = (
        ('Product', {
            'fields': ('product',)
        }),
        ('Catalog Structure', {
            'fields': (
                ('collection', 'model'),
                ('color', 'door_type'),
                ('door_size', 'custom_size'),
            )
        }),
        ('Additional Info', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )
    
    def product_sku(self, obj):
        return obj.product.sku
    product_sku.short_description = 'SKU'
    product_sku.admin_order_field = 'product__sku'
    
    def product_name(self, obj):
        return obj.product.name
    product_name.short_description = 'Product Name'
    product_name.admin_order_field = 'product__name'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('product', 'collection', 'model', 'color')
