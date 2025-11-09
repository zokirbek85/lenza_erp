from django.contrib import admin

from .models import ReturnedProduct


@admin.register(ReturnedProduct)
class ReturnedProductAdmin(admin.ModelAdmin):
    list_display = ('product', 'dealer', 'quantity', 'return_type', 'created_by', 'created_at')
    list_filter = ('return_type', 'created_at')
    search_fields = ('product__name', 'dealer__name', 'reason')
