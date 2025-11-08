from rest_framework import serializers

from .models import KPIRecord


class KPIRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPIRecord
        fields = '__all__'
