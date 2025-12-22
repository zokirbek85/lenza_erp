from django.contrib import admin

from .models import Order, OrderItem, OrderReturn, OrderStatusLog


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('display_no', 'dealer', 'status', 'total_usd', 'value_date')
    list_filter = ('status', 'dealer')
    search_fields = ('display_no',)
    autocomplete_fields = ('dealer', 'created_by')
    fields = ('display_no', 'dealer', 'status', 'value_date', 'created_by', 'note')
    inlines = (OrderItemInline,)


@admin.register(OrderStatusLog)
class OrderStatusLogAdmin(admin.ModelAdmin):
    list_display = ('order', 'old_status', 'new_status', 'by_user', 'at')
    list_filter = ('new_status',)


@admin.register(OrderReturn)
class OrderReturnAdmin(admin.ModelAdmin):
    list_display = ('order', 'item', 'quantity', 'is_defect', 'amount_usd', 'created_at')
    list_filter = ('is_defect',)
