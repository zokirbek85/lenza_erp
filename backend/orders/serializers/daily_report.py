"""
Daily Financial Report Serializers
"""
from rest_framework import serializers


class DailyReportRequestSerializer(serializers.Serializer):
    """Hisobot so'rovini tasdiqlash"""
    report_date = serializers.DateField(required=True, help_text="Hisobot sanasi (YYYY-MM-DD)")


class OrderItemReportSerializer(serializers.Serializer):
    """Order item hisobot uchun"""
    product_name = serializers.CharField()
    size = serializers.CharField(allow_blank=True)
    unit = serializers.CharField()
    quantity = serializers.FloatField()
    price_usd = serializers.FloatField()
    total_usd = serializers.FloatField()


class OrderReportSerializer(serializers.Serializer):
    """Order hisobot uchun"""
    order_number = serializers.CharField()
    created_at = serializers.DateTimeField()
    status = serializers.CharField()
    total_usd = serializers.FloatField()
    items = OrderItemReportSerializer(many=True)


class ReturnItemReportSerializer(serializers.Serializer):
    """Return item hisobot uchun"""
    product_name = serializers.CharField()
    quantity = serializers.FloatField()
    price_usd = serializers.FloatField()
    total_usd = serializers.FloatField()
    status = serializers.CharField()


class ReturnReportSerializer(serializers.Serializer):
    """Return hisobot uchun"""
    created_at = serializers.DateTimeField()
    total_usd = serializers.FloatField()
    items = ReturnItemReportSerializer(many=True)


class PaymentReportSerializer(serializers.Serializer):
    """Payment hisobot uchun"""
    account_type = serializers.CharField()
    account_name = serializers.CharField()
    currency = serializers.CharField()
    amount = serializers.FloatField()
    amount_usd = serializers.FloatField()
    exchange_rate = serializers.FloatField(required=False)


class RefundReportSerializer(serializers.Serializer):
    """Refund hisobot uchun"""
    amount_usd = serializers.FloatField()
    note = serializers.CharField(allow_blank=True)


class DealerReportSerializer(serializers.Serializer):
    """Diller hisobot uchun"""
    dealer_id = serializers.IntegerField()
    dealer_name = serializers.CharField()
    dealer_code = serializers.CharField()
    orders = OrderReportSerializer(many=True)
    returns = ReturnReportSerializer(many=True)
    payments = PaymentReportSerializer(many=True)
    refunds = RefundReportSerializer(many=True)


class OrdersSummarySerializer(serializers.Serializer):
    """Orderlar xulosasi"""
    total_dealers = serializers.IntegerField()
    total_amount_usd = serializers.FloatField()
    total_products = serializers.IntegerField()
    total_quantity = serializers.FloatField()
    total_value_usd = serializers.FloatField()


class PaymentsSummarySerializer(serializers.Serializer):
    """To'lovlar xulosasi"""
    total_dealers = serializers.IntegerField()
    cash_usd = serializers.FloatField()
    cash_uzs = serializers.FloatField()
    cash_uzs_usd_equivalent = serializers.FloatField()
    card_payments = serializers.ListField(child=serializers.DictField())
    bank_payments = serializers.ListField(child=serializers.DictField())
    total_usd = serializers.FloatField()


class ReturnsSummarySerializer(serializers.Serializer):
    """Qaytarmalar xulosasi"""
    total_dealers = serializers.IntegerField()
    total_products = serializers.IntegerField()
    total_quantity = serializers.FloatField()
    total_amount_usd = serializers.FloatField()


class RefundsSummarySerializer(serializers.Serializer):
    """Refundlar xulosasi"""
    total_dealers = serializers.IntegerField()
    total_amount_usd = serializers.FloatField()


class OverallSummarySerializer(serializers.Serializer):
    """Umumiy holat"""
    total_dealers_debt_usd = serializers.FloatField()
    warehouse_total_quantity = serializers.FloatField()
    warehouse_total_value_usd = serializers.FloatField()


class ReportSummarySerializer(serializers.Serializer):
    """To'liq xulosa"""
    report_date = serializers.DateField()
    exchange_rate = serializers.FloatField()
    orders = OrdersSummarySerializer()
    payments = PaymentsSummarySerializer()
    returns = ReturnsSummarySerializer()
    refunds = RefundsSummarySerializer()
    overall = OverallSummarySerializer()


class DailyFinancialReportSerializer(serializers.Serializer):
    """To'liq kunlik moliyaviy hisobot"""
    report_date = serializers.DateField()
    dealers = DealerReportSerializer(many=True)
    summary = ReportSummarySerializer()
