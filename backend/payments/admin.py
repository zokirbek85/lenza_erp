from django.contrib import admin

from .models import CurrencyRate, Payment


@admin.register(CurrencyRate)
class CurrencyRateAdmin(admin.ModelAdmin):
    list_display = ('rate_date', 'usd_to_uzs', 'created_at')
    ordering = ('-rate_date',)
    search_fields = ('rate_date',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('dealer', 'amount', 'currency', 'amount_usd', 'method', 'pay_date')
    list_filter = ('method', 'currency')
    search_fields = ('dealer__name',)
    autocomplete_fields = ('dealer', 'rate')
