from django.contrib import admin
from .models import LedgerAccount, LedgerEntry


@admin.register(LedgerAccount)
class LedgerAccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'currency', 'is_active', 'payment_card', 'created_at')
    list_filter = ('type', 'is_active', 'currency')
    search_fields = ('name',)
    ordering = ('type', 'name')


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'account', 'kind', 'currency', 'amount', 'amount_usd', 'note', 'created_by')
    list_filter = ('kind', 'date', 'currency', 'account')
    search_fields = ('note', 'ref_app', 'ref_id')
    date_hierarchy = 'date'
    ordering = ('-date', '-id')
    readonly_fields = ('created_at', 'amount_usd')
