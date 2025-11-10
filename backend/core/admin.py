from django.contrib import admin
from .middleware import AuditLog
from .models import CompanyInfo, UserManual


@admin.register(CompanyInfo)
class CompanyInfoAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'updated_at')
    search_fields = ('name', 'email', 'phone')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'method', 'path', 'timestamp')
    list_filter = ('method', 'timestamp')
    search_fields = ('user__username', 'path')
    readonly_fields = ('user', 'method', 'path', 'data_snapshot', 'timestamp')


@admin.register(UserManual)
class UserManualAdmin(admin.ModelAdmin):
    list_display = ('title', 'role', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('title', 'content')
    fields = ('title', 'content', 'role')
