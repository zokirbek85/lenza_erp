from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import FinanceAccount, FinanceTransaction


@admin.register(FinanceAccount)
class FinanceAccountAdmin(admin.ModelAdmin):
    """FinanceAccount admin interface"""
    list_display = ['name', 'type', 'currency', 'is_active_display', 'created_at']
    list_filter = ['type', 'currency', 'is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['balance_display_detail', 'created_at', 'updated_at']
    
    fieldsets = (
        (_('Asosiy malumotlar'), {
            'fields': ('name', 'type', 'currency')
        }),
        (_('Balans'), {
            'fields': ('balance_display_detail',),
            'description': _('Balance is calculated from approved transactions')
        }),
        (_('Status'), {
            'fields': ('is_active',)
        }),
        (_('Vaqt'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def balance_display_detail(self, obj):
        """Display balance with color (only in detail view to avoid N+1 queries)"""
        balance = obj.balance
        color = 'green' if balance >= 0 else 'red'
        return format_html(
            '<span style="color: {}; font-size: 16px; font-weight: bold;">{:,.2f} {}</span>',
            color,
            balance,
            obj.currency
        )
    balance_display_detail.short_description = _('Balans')
    
    def is_active_display(self, obj):
        """Display active status with icon"""
        if obj.is_active:
            return format_html('<span style="color: green;">✓ {}</span>', _('Aktiv'))
        return format_html('<span style="color: red;">✗ {}</span>', _('Noaktiv'))
    is_active_display.short_description = _('Status')


@admin.register(FinanceTransaction)
class FinanceTransactionAdmin(admin.ModelAdmin):
    """FinanceTransaction admin interface"""
    list_display = [
        'id',
        'date',
        'type_display',
        'account',
        'dealer',
        'amount_display',
        'status_display',
        'created_by',
        'created_at'
    ]
    list_filter = ['type', 'status', 'currency', 'date', 'created_at', 'account']
    search_fields = ['comment', 'category', 'dealer__name', 'account__name']
    readonly_fields = [
        'amount_usd',
        'exchange_rate',
        'exchange_rate_date',
        'created_by',
        'created_at',
        'updated_at',
        'approved_by',
        'approved_at'
    ]
    date_hierarchy = 'date'
    
    fieldsets = (
        (_('Asosiy malumotlar'), {
            'fields': ('type', 'account', 'dealer', 'date')
        }),
        (_('Summa'), {
            'fields': ('amount', 'currency', 'amount_usd', 'exchange_rate', 'exchange_rate_date')
        }),
        (_('Kategoriya va izoh'), {
            'fields': ('category', 'comment')
        }),
        (_('Status'), {
            'fields': ('status', 'approved_by', 'approved_at')
        }),
        (_('Yaratilgan'), {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def type_display(self, obj):
        """Display type with color"""
        if obj.type == FinanceTransaction.TransactionType.INCOME:
            return format_html('<span style="color: green;">↑ {}</span>', obj.get_type_display())
        return format_html('<span style="color: red;">↓ {}</span>', obj.get_type_display())
    type_display.short_description = _('Turi')
    
    def amount_display(self, obj):
        """Display amount with currency"""
        color = 'green' if obj.type == FinanceTransaction.TransactionType.INCOME else 'red'
        return format_html(
            '<span style="color: {};">{:,.2f} {}</span>',
            color,
            obj.amount,
            obj.currency
        )
    amount_display.short_description = _('Summa')
    
    def status_display(self, obj):
        """Display status with color"""
        colors = {
            'draft': 'gray',
            'approved': 'green',
            'cancelled': 'red',
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    status_display.short_description = _('Status')
    
    def save_model(self, request, obj, form, change):
        """Auto set created_by"""
        if not change:  # Creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
