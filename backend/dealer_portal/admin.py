from django.contrib import admin
from django.utils.html import format_html

from .models import DealerCart, DealerCartItem


class DealerCartItemInline(admin.TabularInline):
    model = DealerCartItem
    extra = 0
    readonly_fields = ['added_at', 'updated_at', 'get_subtotal_display']
    fields = ['product', 'quantity', 'get_subtotal_display', 'added_at']

    def get_subtotal_display(self, obj):
        if obj.id:
            return format_html(
                '<span style="font-weight: bold;">${:,.2f}</span>',
                obj.get_subtotal()
            )
        return '-'
    get_subtotal_display.short_description = 'Subtotal'


@admin.register(DealerCart)
class DealerCartAdmin(admin.ModelAdmin):
    list_display = ['dealer', 'get_total_items', 'get_total_quantity', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['dealer__name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [DealerCartItemInline]

    def get_total_items(self, obj):
        return obj.get_total_items()
    get_total_items.short_description = 'Items'

    def get_total_quantity(self, obj):
        return format_html(
            '<span style="font-weight: bold;">{:.2f}</span>',
            obj.get_total_quantity()
        )
    get_total_quantity.short_description = 'Total Qty'


@admin.register(DealerCartItem)
class DealerCartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'quantity', 'get_subtotal_display', 'added_at']
    list_filter = ['added_at', 'cart__dealer']
    search_fields = ['product__name', 'product__sku', 'cart__dealer__name']
    readonly_fields = ['added_at', 'updated_at', 'get_subtotal_display']

    def get_subtotal_display(self, obj):
        return format_html(
            '<span style="font-weight: bold; color: green;">${:,.2f}</span>',
            obj.get_subtotal()
        )
    get_subtotal_display.short_description = 'Subtotal'
