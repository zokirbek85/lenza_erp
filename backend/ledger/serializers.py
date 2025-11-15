"""
Ledger Serializers - Professional DRF
"""
from rest_framework import serializers
from .models import LedgerRecord
from decimal import Decimal


class LedgerRecordSerializer(serializers.ModelSerializer):
    """Ledger record serializer - to'liq funksional"""
    
    # Read-only fields
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    
    class Meta:
        model = LedgerRecord
        fields = [
            'id',
            'date',
            'type',
            'type_display',
            'source',
            'source_display',
            'currency',
            'amount',
            'amount_usd',
            'amount_uzs',
            'description',
            'ref_model',
            'ref_id',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['amount_usd', 'amount_uzs', 'created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Yaratishda created_by ni avtomatik qo'shish"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class LedgerBalanceSerializer(serializers.Serializer):
    """Balans serializer"""
    total_income = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    income_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
    expense_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency = serializers.CharField()
    usd_rate = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)


class LedgerTrendSerializer(serializers.Serializer):
    """Trend ma'lumotlari serializer"""
    date = serializers.DateField()
    income = serializers.DecimalField(max_digits=14, decimal_places=2)
    expense = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    income_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
    expense_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance_usd = serializers.DecimalField(max_digits=14, decimal_places=2)


class LedgerSourceDistributionSerializer(serializers.Serializer):
    """Manba bo'yicha taqsimot serializer"""
    source = serializers.CharField()
    source_display = serializers.CharField()
    count = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
