from rest_framework import serializers

from .models import Notification, SystemNotification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('created_at', 'user')


class SystemNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemNotification
        fields = ('id', 'title', 'message', 'level', 'created_at')
