from django.contrib import admin

from .models import Dealer, Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Dealer)
class DealerAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'region', 'manager_user', 'opening_balance_usd', 'is_active')
    search_fields = ('code', 'name')
    list_filter = ('region', 'is_active')
    autocomplete_fields = ('region', 'manager_user')
