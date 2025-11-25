from django.contrib import admin

from .models import CurrencyRate, Payment, PaymentCard


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
