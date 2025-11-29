from django.contrib import admin

from .models import (
    Cashbox,
    CashboxOpeningBalance,
    CurrencyRate,
    Expense,
    ExpenseCategory,
    Payment,
    PaymentCard,
)


@admin.register(CurrencyRate)
class CurrencyRateAdmin(admin.ModelAdmin):
    list_display = ('rate_date', 'usd_to_uzs', 'created_at')
    ordering = ('-rate_date',)
    search_fields = ('rate_date',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('dealer', 'amount', 'currency', 'amount_usd', 'method', 'card', 'status', 'pay_date', 'created_by', 'approved_by')
    list_filter = ('method', 'currency', 'status')
    search_fields = ('dealer__name', 'created_by__username', 'approved_by__username')
    autocomplete_fields = ('dealer', 'rate', 'card', 'created_by', 'approved_by')
    readonly_fields = ('amount_usd', 'amount_uzs', 'approved_at', 'created_at')


@admin.register(PaymentCard)
class PaymentCardAdmin(admin.ModelAdmin):
    list_display = ('name', 'masked_number', 'holder_name', 'is_active', 'created_at')
    search_fields = ('name', 'number', 'holder_name')
    list_filter = ('is_active',)


@admin.register(Cashbox)
class CashboxAdmin(admin.ModelAdmin):
    list_display = ('name', 'cashbox_type', 'currency', 'is_active', 'created_at')
    list_filter = ('cashbox_type', 'currency', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('cashbox_type', 'name')


@admin.register(CashboxOpeningBalance)
class CashboxOpeningBalanceAdmin(admin.ModelAdmin):
    list_display = ('cashbox_type', 'balance', 'currency', 'date', 'created_at')
    list_filter = ('cashbox_type', 'currency', 'date')
    search_fields = ('cashbox_type',)
    ordering = ('-date', 'cashbox_type')
    date_hierarchy = 'date'


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'code', 'description')
    ordering = ('name',)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        'expense_date',
        'category',
        'cashbox',
        'amount_original',
        'currency',
        'status',
        'created_by',
        'approved_by'
    )
    list_filter = ('status', 'currency', 'category', 'cashbox', 'expense_date')
    search_fields = ('description', 'category__name', 'cashbox__name')
    readonly_fields = ('amount_uzs', 'amount_usd', 'created_at', 'updated_at', 'approved_at')
    autocomplete_fields = ('category', 'cashbox', 'created_by', 'approved_by')
    ordering = ('-expense_date', '-created_at')
    date_hierarchy = 'expense_date'
    
    fieldsets = (
        ('Asosiy ma\'lumotlar', {
            'fields': ('expense_date', 'category', 'cashbox', 'description')
        }),
        ('Pul summasi', {
            'fields': ('currency', 'amount_original', 'manual_rate', 'amount_uzs', 'amount_usd')
        }),
        ('Holat', {
            'fields': ('status',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'approved_by', 'approved_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
