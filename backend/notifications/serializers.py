from rest_framework import serializers

from .models import Notification, SystemNotification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('created_at', 'user')


class SystemNotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = SystemNotification
        fields = ('id', 'title', 'message', 'level', 'created_at', 'is_read')

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or request.user.is_anonymous:
            return False
        return obj.read_by.filter(pk=request.user.pk).exists()
