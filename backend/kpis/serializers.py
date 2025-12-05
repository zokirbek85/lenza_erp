from rest_framework import serializers

from .models import KPIRecord


class KPIRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPIRecord
        fields = '__all__'


class ManagerKPIOverviewSerializer(serializers.Serializer):
    """Manager KPI overview response serializer"""
    
    # Manager info
    manager_id = serializers.IntegerField()
    manager_name = serializers.CharField()
    
    # Summary metrics
    total_sales_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_sales_uzs = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_payments_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_payments_uzs = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    bonus_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    bonus_uzs = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    
    # Period info
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    
    # Regional breakdown
    sales_by_region = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Top products
    top_products = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Weekly sales trend
    weekly_sales = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Monthly payments
    monthly_payments = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Dealer count
    total_dealers = serializers.IntegerField()
    active_dealers = serializers.IntegerField()


class KPILeaderboardItemSerializer(serializers.Serializer):
    """Single manager in leaderboard"""
    manager_id = serializers.IntegerField()
    manager_name = serializers.CharField()
    total_sales_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_payments_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    bonus_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    dealer_count = serializers.IntegerField()
    rank = serializers.IntegerField()


class KPILeaderboardSerializer(serializers.Serializer):
    """KPI Leaderboard for all managers"""
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    managers = KPILeaderboardItemSerializer(many=True)
