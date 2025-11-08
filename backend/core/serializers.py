from rest_framework import serializers

from .middleware import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'method', 'path', 'data_snapshot', 'timestamp')
