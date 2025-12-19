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


@admin.register(DashboardLayout)
class DashboardLayoutAdmin(admin.ModelAdmin):
    list_display = ('user', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('updated_at',)


@admin.register(UserReplacement)
class UserReplacementAdmin(admin.ModelAdmin):
    list_display = ('old_user', 'new_user', 'replaced_at', 'replaced_by')
    search_fields = ('old_user__username', 'new_user__username', 'replaced_by__username')
    readonly_fields = ('old_user', 'new_user', 'replaced_at', 'replaced_by')
    list_filter = ('replaced_at',)
    
    def has_add_permission(self, request):
        # Only allow creation through API endpoint
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Never allow deletion - this is an audit log
        return False

