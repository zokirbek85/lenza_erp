from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, DashboardLayout, UserReplacement


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Lenza ERP', {'fields': ('role', 'archived_at', 'archived_reason')}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        (None, {'fields': ('role',)}),
    )
    list_display = ('username', 'email', 'role', 'is_active', 'archived_at', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active', 'archived_reason')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    readonly_fields = ('archived_at',)
    ordering = ('username',)


@admin.register(DashboardLayout)
class DashboardLayoutAdmin(admin.ModelAdmin):
    list_display = ('user', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('updated_at',)


@admin.register(UserReplacement)
class UserReplacementAdmin(admin.ModelAdmin):
    list_display = ('old_user', 'new_user', 'replacement_date', 'replaced_at', 'replaced_by')
    search_fields = ('old_user__username', 'new_user__username', 'replaced_by__username', 'comment')
    readonly_fields = ('replaced_at',)
    list_filter = ('replacement_date', 'replaced_at')
    fieldsets = (
        ('Replacement Details', {
            'fields': ('old_user', 'new_user', 'replacement_date')
        }),
        ('Metadata', {
            'fields': ('replaced_at', 'replaced_by', 'comment')
        }),
    )
    autocomplete_fields = ['old_user', 'new_user', 'replaced_by']

