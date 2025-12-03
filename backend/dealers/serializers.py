from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Dealer, Region

User = get_user_model()


class DealerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdown lists (no computed fields)"""
    class Meta:
        model = Dealer
        fields = ('id', 'name', 'code', 'contact')


class RegionSerializer(serializers.ModelSerializer):
    manager_user = serializers.StringRelatedField(read_only=True)
    manager_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='manager_user', allow_null=True, required=False
    )

    class Meta:
        model = Region
        fields = ('id', 'name', 'manager_user', 'manager_user_id')


class DealerSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    region_id = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(), source='region', write_only=True, allow_null=True
    )
    manager_user = serializers.StringRelatedField(read_only=True)
    manager_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='manager_user', allow_null=True, required=False
    )
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, source='balance_usd', read_only=True)
    debt = serializers.DecimalField(max_digits=14, decimal_places=2, source='debt_usd', read_only=True)
    current_debt_usd = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    current_debt_uzs = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Dealer
        fields = (
            'id',
            'name',
            'code',
            'region',
            'region_id',
            'contact',
            'manager_user',
            'manager_user_id',
            'opening_balance_usd',
            'debt',
            'is_active',
            'balance',
            'current_debt_usd',
            'current_debt_uzs',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at', 'balance')
