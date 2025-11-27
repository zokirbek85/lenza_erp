from django.contrib import admin

from .models import (
    CashboxOpeningBalance,
    CurrencyRate,
    Expense,
    ExpenseCategory,
    FinanceLog,
    FinanceSource,
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


@admin.register(CashboxOpeningBalance)
class CashboxOpeningBalanceAdmin(admin.ModelAdmin):
    list_display = ('cashbox_type', 'balance', 'currency', 'date', 'created_at')
    list_filter = ('cashbox_type', 'currency', 'date')
    search_fields = ('cashbox_type',)
    ordering = ('-date', 'cashbox_type')
    date_hierarchy = 'date'


# ============================================================================
# FINANCE SOURCE & EXPENSES ADMIN
# ============================================================================

class FinanceLogInline(admin.TabularInline):
    """Inline display of finance logs in FinanceSource admin"""
    model = FinanceLog
    extra = 0
    readonly_fields = ('type', 'amount', 'old_balance', 'new_balance', 'reference_type', 'reference_id', 'created_at', 'created_by')
    can_delete = False
    ordering = ('-created_at',)
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(FinanceSource)
class FinanceSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'currency', 'balance', 'is_active', 'created_at')
    list_filter = ('type', 'currency', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('name',)
    readonly_fields = ('balance', 'created_at', 'updated_at')
    inlines = [FinanceLogInline]


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    ordering = ('name',)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('source', 'category', 'amount', 'currency', 'expense_date', 'status', 'created_by', 'approved_by')
    list_filter = ('status', 'currency', 'expense_date', 'category')
    search_fields = ('description', 'source__name', 'category__name')
    autocomplete_fields = ('source', 'category', 'created_by', 'approved_by')
    readonly_fields = ('approved_at', 'created_at', 'updated_at')
    ordering = ('-expense_date', '-created_at')
    date_hierarchy = 'expense_date'


@admin.register(FinanceLog)
class FinanceLogAdmin(admin.ModelAdmin):
    list_display = ('source', 'type', 'amount', 'old_balance', 'new_balance', 'reference_type', 'reference_id', 'created_at', 'created_by')
    list_filter = ('type', 'reference_type', 'created_at')
    search_fields = ('source__name', 'description')
    readonly_fields = ('source', 'type', 'amount', 'old_balance', 'new_balance', 'reference_type', 'reference_id', 'description', 'created_at', 'created_by')
    ordering = ('-created_at',)
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
