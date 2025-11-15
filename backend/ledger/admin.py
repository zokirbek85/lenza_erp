"""
Ledger Admin - Django Admin Panel
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import LedgerRecord


@admin.register(LedgerRecord)
class LedgerRecordAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'date',
        'type_badge',
        'source_badge',
        'amount_display',
        'description_short',
        'created_by',
        'created_at'
    ]
    list_filter = ['type', 'source', 'currency', 'date', 'created_at']
    search_fields = ['description', 'ref_model', 'created_by__full_name']
    readonly_fields = ['created_by', 'created_at', 'updated_at', 'amount_in_usd']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Asosiy malumotlar', {
            'fields': ('date', 'type', 'source', 'amount', 'currency', 'description')
        }),
        ('Reference', {
            'fields': ('ref_model', 'ref_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('amount_in_usd', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def type_badge(self, obj):
        if obj.type == 'income':
            return format_html('<span style="background: #52c41a; color: white; padding: 2px 8px; border-radius: 3px;">⬆ Kirim</span>')
        return format_html('<span style="background: #ff4d4f; color: white; padding: 2px 8px; border-radius: 3px;">⬇ Chiqim</span>')
    type_badge.short_description = 'Turi'
    
    def source_badge(self, obj):
        colors = {
            'payment': '#1890ff',
            'expense': '#ff4d4f',
            'adjustment': '#faad14',
            'return': '#722ed1',
        }
        color = colors.get(obj.source, '#666')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_source_display()
        )
    source_badge.short_description = 'Manba'
    
    def amount_display(self, obj):
        symbol = '+' if obj.type == 'income' else '-'
        color = '#52c41a' if obj.type == 'income' else '#ff4d4f'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}{} {}</span>',
            color,
            symbol,
            obj.amount,
            obj.currency
        )
    amount_display.short_description = 'Summa'
    
    def description_short(self, obj):
        if len(obj.description) > 50:
            return obj.description[:47] + '...'
        return obj.description
    description_short.short_description = 'Tavsif'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Yangi obyekt
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
