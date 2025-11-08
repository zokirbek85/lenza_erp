from django.contrib import admin

from .models import Notification, SystemNotification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('user__username', 'title')


@admin.register(SystemNotification)
class SystemNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'level', 'created_at')
    list_filter = ('level',)
    search_fields = ('title', 'message')
