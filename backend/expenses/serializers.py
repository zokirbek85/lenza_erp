"""
Expenses Serializers - Professional DRF
"""
from rest_framework import serializers
from .models import Expense, ExpenseType
from decimal import Decimal


class ExpenseTypeSerializer(serializers.ModelSerializer):
    """Chiqim turi serializer"""
    
    class Meta:
        model = ExpenseType
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    """Chiqim serializer - to'liq funksional"""
    
    # Read-only fields (ma'lumot ko'rsatish uchun)
    type_name = serializers.CharField(source='type.name', read_only=True)
    cashbox_name = serializers.CharField(source='cashbox.name', read_only=True, allow_null=True)
    cashbox_currency = serializers.CharField(source='cashbox.currency', read_only=True, allow_null=True)
    card_name = serializers.CharField(source='card.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id',
            'date',
            'type',
            'type_name',
            'cashbox',
            'cashbox_name',
            'cashbox_currency',
            'method',
            'method_display',
            'card',
            'card_name',
            'currency',
            'amount',
            'amount_usd',
            'amount_uzs',
            'description',
            'status',
            'status_display',
            'created_by',
            'created_by_name',
            'approved_by',
            'approved_by_name',
            'created_at',
            'updated_at',
            'approved_at',
        ]
        read_only_fields = [
            'amount_usd',
            'amount_uzs',
            'created_by',
            'approved_by',
            'created_at',
            'updated_at',
            'approved_at',
        ]
    
    def validate(self, data):
        """Cross-field validation"""
        cashbox = data.get('cashbox')
        currency = data.get('currency')
        method = data.get('method')
        card = data.get('card')
        
        # NEW: Cashbox must be provided
        if not cashbox:
            raise serializers.ValidationError({
                'cashbox': "Kassa tanlanishi kerak"
            })
        
        # NEW: Currency must match cashbox currency
        if cashbox and currency and currency != cashbox.currency:
            raise serializers.ValidationError({
                'currency': f"Valyuta ({currency}) kassaning valyutasi ({cashbox.currency}) bilan mos emas"
            })
        
        # LEGACY: Card validation (backward compatibility)
        if card and method != Expense.METHOD_CARD:
            raise serializers.ValidationError({
                'method': "Karta tanlangan bo'lsa, to'lov usuli 'Karta' bo'lishi kerak"
            })
        
        if method == Expense.METHOD_CARD and not card and not cashbox:
            raise serializers.ValidationError({
                'card': "To'lov usuli 'Karta' bo'lsa, karta yoki kassa tanlanishi kerak"
            })
        
        return data
    
    def create(self, validated_data):
        """Yaratishda created_by ni avtomatik qo'shish"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ExpenseStatsSerializer(serializers.Serializer):
    """Statistika serializer"""
    today_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    week_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    month_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency = serializers.CharField()
    usd_rate = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)


class ExpenseTrendSerializer(serializers.Serializer):
    """Trend ma'lumotlari serializer"""
    date = serializers.DateField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
    count = serializers.IntegerField()


class ExpenseDistributionSerializer(serializers.Serializer):
    """Taqsimot ma'lumotlari serializer"""
    type_name = serializers.CharField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_usd = serializers.DecimalField(max_digits=14, decimal_places=2)
    count = serializers.IntegerField()
    percent = serializers.DecimalField(max_digits=5, decimal_places=2)
