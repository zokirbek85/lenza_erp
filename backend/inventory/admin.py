from django.contrib import admin

from .models import InventoryAdjustment, ReturnedProduct


@admin.register(InventoryAdjustment)
class InventoryAdjustmentAdmin(admin.ModelAdmin):
    list_display = (
        'product',
        'date',
        'delta_ok',
        'delta_defect',
        'total_delta',
        'created_by',
        'created_at',
    )
    list_filter = ('date', 'created_at', 'created_by')
    search_fields = ('product__sku', 'product__name', 'comment')
    readonly_fields = (
        'product',
        'delta_ok',
        'delta_defect',
        'previous_ok',
        'previous_defect',
        'new_ok',
        'new_defect',
        'date',
        'created_by',
        'created_at',
    )
    
    def has_add_permission(self, request):
        # Adjustments should only be created via audit import
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Keep audit trail intact
        return False


@admin.register(ReturnedProduct)
class ReturnedProductAdmin(admin.ModelAdmin):
    list_display = ('product', 'dealer', 'quantity', 'return_type', 'created_by', 'created_at')
    list_filter = ('return_type', 'created_at')
    search_fields = ('product__name', 'dealer__name', 'reason')
