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
    
    # New opening balance fields with historical rate support
    opening_balance = serializers.DecimalField(max_digits=18, decimal_places=2, required=False)
    opening_balance_currency = serializers.ChoiceField(choices=['USD', 'UZS'], required=False)
    opening_balance_date = serializers.DateField(required=False)
    historical_opening_balance_usd = serializers.SerializerMethodField()
    historical_opening_balance_uzs = serializers.SerializerMethodField()
    
    # Computed balance fields
    current_balance_usd = serializers.SerializerMethodField()
    current_balance_uzs = serializers.SerializerMethodField()
    converted_balance_uzs = serializers.SerializerMethodField()
    
    # Legacy compatibility
    balance = serializers.SerializerMethodField()
    current_debt_usd = serializers.SerializerMethodField()
    current_debt_uzs = serializers.SerializerMethodField()
    
    def get_historical_opening_balance_usd(self, obj):
        """
        Calculate opening balance in USD using historical exchange rate from opening_balance_date.
        Returns the amount already stored if currency is USD, otherwise converts from UZS.
        """
        from decimal import Decimal
        from core.utils.currency import get_exchange_rate
        
        opening_amount = obj.opening_balance or Decimal('0')
        opening_currency = obj.opening_balance_currency or 'USD'
        opening_date = obj.opening_balance_date or obj.created_at.date() if obj.created_at else None
        
        if opening_currency == 'USD':
            return opening_amount
        else:  # UZS → USD
            if opening_date:
                rate, _ = get_exchange_rate(opening_date)
                return (opening_amount / rate).quantize(Decimal('0.01')) if rate > 0 else Decimal('0')
            return Decimal('0')
    
    def get_historical_opening_balance_uzs(self, obj):
        """
        Calculate opening balance in UZS using historical exchange rate from opening_balance_date.
        Returns the amount already stored if currency is UZS, otherwise converts from USD.
        """
        from decimal import Decimal
        from core.utils.currency import get_exchange_rate
        
        opening_amount = obj.opening_balance or Decimal('0')
        opening_currency = obj.opening_balance_currency or 'USD'
        opening_date = obj.opening_balance_date or obj.created_at.date() if obj.created_at else None
        
        if opening_currency == 'UZS':
            return opening_amount
        else:  # USD → UZS
            if opening_date:
                rate, _ = get_exchange_rate(opening_date)
                return (opening_amount * rate).quantize(Decimal('0.01'))
            return Decimal('0')
    
    def get_current_balance_usd(self, obj):
        """Use annotated value if available, otherwise calculate from property"""
        if hasattr(obj, 'calculated_balance_usd'):
            return obj.calculated_balance_usd
        return obj.balance_usd
    
    def get_current_balance_uzs(self, obj):
        """Use annotated value if available, otherwise calculate from property"""
        if hasattr(obj, 'calculated_balance_uzs'):
            return obj.calculated_balance_uzs
        return obj.balance_uzs
    
    def get_converted_balance_uzs(self, obj):
        """
        Convert USD balance to UZS using today's exchange rate.
        Always returns a value (never 0 or None if USD balance exists).
        Formula: USD balance × current exchange rate
        """
        from decimal import Decimal
        from finance.models import ExchangeRate
        
        # Get USD balance
        usd_balance = self.get_current_balance_usd(obj)
        if usd_balance is None:
            usd_balance = Decimal('0')
        
        # Get today's exchange rate
        latest_rate = ExchangeRate.objects.order_by('-rate_date').first()
        rate = latest_rate.usd_to_uzs if latest_rate else Decimal('1')
        
        # Convert: USD × rate = UZS
        return (Decimal(str(usd_balance)) * Decimal(str(rate))).quantize(Decimal('0.01'))
    
    def get_balance(self, obj):
        """Legacy field - uses current_balance_usd"""
        return self.get_current_balance_usd(obj)
    
    def get_current_debt_usd(self, obj):
        """Return debt (only positive balances)"""
        balance = self.get_current_balance_usd(obj)
        return balance if balance and balance > 0 else 0
    
    def get_current_debt_uzs(self, obj):
        """Return debt in UZS (only positive balances)"""
        balance = self.get_current_balance_uzs(obj)
        return balance if balance and balance > 0 else 0

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
            # New opening balance fields (read/write)
            'opening_balance',
            'opening_balance_currency',
            'opening_balance_date',
            # Historical opening balance (read-only, calculated from date)
            'historical_opening_balance_usd',
            'historical_opening_balance_uzs',
            # Legacy opening balance fields (kept for compatibility)
            'opening_balance_usd',
            'opening_balance_uzs',
            # Current balance fields (read-only, calculated)
            'current_balance_usd',
            'current_balance_uzs',
            'converted_balance_uzs',
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
            'converted_balance_uzs',
            'current_debt_usd',
            'current_debt_uzs',
            'historical_opening_balance_usd',
            'historical_opening_balance_uzs',
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
