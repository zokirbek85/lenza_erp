"""
Expenses Admin - Django Admin Panel
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import ExpenseType, ExpenseCategory, Expense


@admin.register(ExpenseType)
class ExpenseTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active_badge', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: green;">✔ Faol</span>')
        return format_html('<span style="color: red;">✖ Nofaol</span>')
    is_active_badge.short_description = 'Status'


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(ExpenseTypeAdmin):
    """Proxy admin for expense categories (same table as ExpenseType)."""
    pass


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'date',
        'category',
        'amount_display',
        'method_badge',
        'status_badge',
        'created_by',
        'created_at'
    ]
    list_filter = ['status', 'method', 'currency', 'category', 'cashbox', 'date', 'created_at']
    search_fields = ['description', 'category__name', 'created_by__full_name']
    readonly_fields = ['created_by', 'approved_by', 'created_at', 'updated_at', 'approved_at', 'amount_in_usd']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Asosiy malumotlar', {
            'fields': ('date', 'category', 'cashbox', 'amount', 'currency', 'description')
        }),
        ('Tolov malumotlari', {
            'fields': ('method', 'card')
        }),
        ('Status va tasdiqlash', {
            'fields': ('status', 'created_by', 'approved_by', 'approved_at')
        }),
        ('Qoshimcha', {
            'fields': ('amount_in_usd', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def amount_display(self, obj):
        return f"{obj.amount} {obj.currency}"
    amount_display.short_description = 'Summa'
    
    def method_badge(self, obj):
        if obj.method == 'cash':
            return format_html('<span style="background: #52c41a; color: white; padding: 2px 8px; border-radius: 3px;">💵 Naqd</span>')
        return format_html('<span style="background: #1890ff; color: white; padding: 2px 8px; border-radius: 3px;">💳 Karta</span>')
    method_badge.short_description = 'Usul'
    
    def status_badge(self, obj):
        if obj.status == 'approved':
            return format_html('<span style="background: #52c41a; color: white; padding: 2px 8px; border-radius: 3px;">✔ Tasdiqlangan</span>')
        return format_html('<span style="background: #faad14; color: white; padding: 2px 8px; border-radius: 3px;">⏳ Kutilmoqda</span>')
    status_badge.short_description = 'Status'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Yangi obyekt
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
