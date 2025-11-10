from rest_framework import serializers

from .middleware import AuditLog
from .models import CompanyInfo, UserManual


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'method', 'path', 'data_snapshot', 'timestamp')


class CompanyInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyInfo
        fields = '__all__'


class UserManualSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserManual
        fields = '__all__'
