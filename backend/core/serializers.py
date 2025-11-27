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


class DealerDebtSerializer(serializers.Serializer):
    dealer = serializers.CharField()
    debt = serializers.FloatField()


class RegionDebtSerializer(serializers.Serializer):
    region = serializers.CharField()
    debt = serializers.FloatField()


class MonthlyDebtSerializer(serializers.Serializer):
    month = serializers.CharField()
    debt = serializers.FloatField()


class DebtAnalyticsSerializer(serializers.Serializer):
    total_debt = serializers.FloatField()
    by_dealers = DealerDebtSerializer(many=True)
    by_regions = RegionDebtSerializer(many=True)
    monthly = MonthlyDebtSerializer(many=True)


class DashboardSummarySerializer(serializers.Serializer):
    total_sales = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_payments = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_debt = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_dealers = serializers.IntegerField()
    total_stock_good = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_stock_cost = serializers.DecimalField(max_digits=18, decimal_places=2)
    # Backward-compatible fields used by frontend widgets
    net_profit = serializers.DecimalField(max_digits=18, decimal_places=2, required=False)
    cash_balance = serializers.DecimalField(max_digits=18, decimal_places=2, required=False)
    open_orders_count = serializers.IntegerField(required=False)
    satisfaction_score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    overdue_receivables = serializers.ListField(child=serializers.DictField(), required=False)
    revenue_by_month = serializers.ListField(child=serializers.DictField(), required=False)
    revenue_by_product = serializers.ListField(child=serializers.DictField(), required=False)
    inventory_trend = serializers.ListField(child=serializers.DictField(), required=False)
    expenses_vs_budget = serializers.DictField(required=False)
