from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html

from .models import Dealer, Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Dealer)
class DealerAdmin(admin.ModelAdmin):
    list_display = (
        'code', 'name', 'region', 'manager_user',
        'opening_balance_usd', 'portal_access_status', 'is_active'
    )
    search_fields = ('code', 'name', 'portal_username')
    list_filter = ('region', 'is_active', 'portal_enabled')
    autocomplete_fields = ('region', 'manager_user')
    actions = ['generate_portal_credentials', 'reset_portal_passwords', 'enable_portal_access', 'disable_portal_access']

    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'contact', 'phone', 'address', 'region', 'manager_user', 'is_active')
        }),
        ('Financial Information', {
            'fields': (
                'opening_balance', 'opening_balance_currency', 'opening_balance_date',
                'opening_balance_usd', 'opening_balance_uzs', 'debt_usd'
            )
        }),
        ('Portal Access', {
            'fields': ('portal_enabled', 'portal_username', 'portal_password'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('include_in_manager_kpi',)
        }),
    )

    readonly_fields = ('portal_password',)

    def portal_access_status(self, obj):
        """Display portal access status with color."""
        if obj.portal_enabled and obj.portal_username:
            return format_html(
                '<span style="color: green;">✓ Enabled</span>'
            )
        return format_html(
            '<span style="color: gray;">✗ Disabled</span>'
        )
    portal_access_status.short_description = 'Portal Access'

    @admin.action(description='Generate portal credentials for selected dealers')
    def generate_portal_credentials(self, request, queryset):
        """Generate portal login credentials for selected dealers."""
        count = 0
        messages_list = []

        for dealer in queryset:
            if dealer.portal_username:
                messages_list.append(
                    f"{dealer.code}: Already has credentials (username: {dealer.portal_username})"
                )
                continue

            credentials = dealer.generate_portal_credentials()
            messages_list.append(
                f"✓ {dealer.code}: Username: {credentials['username']}, "
                f"Password: {credentials['password']}"
            )
            count += 1

        # Display all messages
        for msg in messages_list:
            self.message_user(request, msg, level=messages.INFO)

        self.message_user(
            request,
            f'Generated credentials for {count} dealer(s). '
            'IMPORTANT: Copy passwords now - they cannot be retrieved later!',
            level=messages.WARNING
        )

    @admin.action(description='Reset portal passwords for selected dealers')
    def reset_portal_passwords(self, request, queryset):
        """Reset portal passwords for selected dealers."""
        count = 0
        messages_list = []

        for dealer in queryset:
            if not dealer.portal_username:
                messages_list.append(
                    f"{dealer.code}: No portal credentials exist. Generate them first."
                )
                continue

            new_password = dealer.reset_portal_password()
            messages_list.append(
                f"✓ {dealer.code}: New password: {new_password}"
            )
            count += 1

        # Display all messages
        for msg in messages_list:
            self.message_user(request, msg, level=messages.INFO)

        self.message_user(
            request,
            f'Reset passwords for {count} dealer(s). '
            'IMPORTANT: Copy passwords now - they cannot be retrieved later!',
            level=messages.WARNING
        )

    @admin.action(description='Enable portal access for selected dealers')
    def enable_portal_access(self, request, queryset):
        """Enable portal access for selected dealers."""
        updated = queryset.update(portal_enabled=True)
        self.message_user(
            request,
            f'Enabled portal access for {updated} dealer(s).',
            level=messages.SUCCESS
        )

    @admin.action(description='Disable portal access for selected dealers')
    def disable_portal_access(self, request, queryset):
        """Disable portal access for selected dealers."""
        updated = queryset.update(portal_enabled=False)
        self.message_user(
            request,
            f'Disabled portal access for {updated} dealer(s).',
            level=messages.WARNING
        )
