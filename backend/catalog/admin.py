from django.contrib import admin

from .models import Brand, Category, Product, Style


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


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'brand', 'sell_price_usd', 'stock_ok', 'is_active')
    list_filter = ('is_active', 'brand', 'category')
    search_fields = ('sku', 'name', 'barcode')
    autocomplete_fields = ('brand', 'category')
