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
    # Nested read, ID write for relations
    region = serializers.SerializerMethodField()
    region_id = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(), source='region', write_only=True, allow_null=True
    )
    manager = serializers.SerializerMethodField()
    manager_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='manager_user', allow_null=True, required=False
    )
    
    # Computed balance fields
    current_balance_usd = serializers.DecimalField(
        max_digits=18, decimal_places=2, read_only=True, coerce_to_string=False
    )
    current_balance_uzs = serializers.DecimalField(
        max_digits=18, decimal_places=2, read_only=True, coerce_to_string=False
    )
    
    # Legacy compatibility
    balance = serializers.DecimalField(
        max_digits=14, decimal_places=2, source='balance_usd', read_only=True, coerce_to_string=False
    )
    current_debt_usd = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True, coerce_to_string=False
    )
    current_debt_uzs = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True, coerce_to_string=False
    )

    class Meta:
        model = Dealer
        fields = (
            'id',
            'code',
            'name',
            'region',
            'region_id',
            'manager',
            'manager_user_id',
            'opening_balance_usd',
            'opening_balance_uzs',
            'current_balance_usd',
            'current_balance_uzs',
            'is_active',
            'phone',
            'address',
            'contact',
            'created_at',
            # Legacy fields for backward compatibility
            'balance',
            'current_debt_usd',
            'current_debt_uzs',
        )
        read_only_fields = (
            'created_at',
            'balance',
            'current_balance_usd',
            'current_balance_uzs',
            'current_debt_usd',
            'current_debt_uzs',
        )
    
    def get_region(self, obj):
        """Return region name or '—' if null."""
        if obj.region:
            return obj.region.name
        return '—'
    
    def get_manager(self, obj):
        """Return manager full name with role or '—' if null."""
        if obj.manager_user:
            user = obj.manager_user
            full_name = user.get_full_name() if hasattr(user, 'get_full_name') else user.username
            role = getattr(user, 'role', '').capitalize() if hasattr(user, 'role') else ''
            
            if full_name and role:
                return f"{full_name} ({role})"
            elif full_name:
                return full_name
            else:
                return user.username
        return '—'
