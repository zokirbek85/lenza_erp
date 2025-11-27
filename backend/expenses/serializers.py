"""
Expenses Serializers - Professional DRF
"""
from decimal import Decimal

from rest_framework import serializers

from .models import Expense, ExpenseCategory, ExpenseType


class ExpenseTypeSerializer(serializers.ModelSerializer):
    """Chiqim turi serializer"""
    
    class Meta:
        model = ExpenseType
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Expense category serializer (proxy over ExpenseType)"""

    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    """Chiqim serializer - to'liq funksional"""
    
    # Read-only fields (ma'lumot ko'rsatish uchun)
    type_name = serializers.CharField(source='type.name', read_only=True)
    category = serializers.PrimaryKeyRelatedField(queryset=ExpenseCategory.objects.all(), allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    cashbox_name = serializers.CharField(source='cashbox.name', read_only=True, allow_null=True)
    cashbox_currency = serializers.CharField(source='cashbox.currency', read_only=True, allow_null=True)
    card_name = serializers.CharField(source='card.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    
    def get_fields(self):
        """Override to set cashbox queryset dynamically and avoid circular import"""
        fields = super().get_fields()
        # Import here to avoid circular import at module load time
        from payments.models import Cashbox
        # Make cashbox field writable with proper queryset
        fields['cashbox'] = serializers.PrimaryKeyRelatedField(
            queryset=Cashbox.objects.filter(is_active=True),
            allow_null=True,
            required=False
        )
        return fields
    
    class Meta:
        model = Expense
        fields = [
            'id',
            'date',
            'category',
            'category_name',
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
        
        # Auto-set currency from cashbox if omitted
        if cashbox and currency is None:
            data['currency'] = cashbox.currency
            currency = cashbox.currency

        if not data.get('category'):
            raise serializers.ValidationError({
                'category': "Kategoriya tanlanishi kerak"
            })

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
        # Keep legacy type aligned with category for backward compatibility
        if validated_data.get('category') and not validated_data.get('type'):
            validated_data['type'] = validated_data['category']
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.get('category') and not validated_data.get('type'):
            validated_data['type'] = validated_data['category']
        return super().update(instance, validated_data)


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating expenses via modal/API"""

    def get_fields(self):
        """Override to set cashbox queryset dynamically and avoid circular import"""
        fields = super().get_fields()
        # Import here to avoid circular import at module load time
        from payments.models import Cashbox
        # Make cashbox field writable with proper queryset
        fields['cashbox'] = serializers.PrimaryKeyRelatedField(
            queryset=Cashbox.objects.filter(is_active=True),
            allow_null=False,
            required=True
        )
        return fields

    class Meta:
        model = Expense
        fields = ["date", "category", "cashbox", "currency", "amount", "description"]

    def validate(self, attrs):
        cashbox = attrs.get("cashbox")
        currency = attrs.get("currency")
        amount = attrs.get("amount")

        if not attrs.get("category"):
            raise serializers.ValidationError({"category": "Category is required"})

        if not cashbox:
            raise serializers.ValidationError({"cashbox": "Cashbox is required"})

        if amount is not None and amount <= Decimal("0"):
            raise serializers.ValidationError({"amount": "Amount must be greater than zero"})

        if cashbox and currency is None:
            attrs["currency"] = cashbox.currency
            currency = attrs["currency"]

        if not currency:
            raise serializers.ValidationError({"currency": "Currency is required"})

        if cashbox and currency and cashbox.currency != currency:
            raise serializers.ValidationError("Currency does not match cashbox currency")

        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        # Align legacy type field so existing reports continue to work
        if validated_data.get("category"):
            validated_data["type"] = validated_data["category"]
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
