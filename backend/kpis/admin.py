from django.contrib import admin

from .models import KPIRecord


@admin.register(KPIRecord)
class KPIRecordAdmin(admin.ModelAdmin):
    list_display = ('dealer', 'name', 'value', 'recorded_at')
    list_filter = ('name',)
    search_fields = ('dealer__name', 'name')
