from rest_framework import serializers

from .models import (
    Cashbox,
    CashboxOpeningBalance,
    CurrencyRate,
    Expense,
    ExpenseCategory,
    Payment,
    PaymentCard,
)
from dealers.serializers import DealerSerializer


class CashboxSerializer(serializers.ModelSerializer):
    """Serializer for Cashbox model"""
    cashbox_type_display = serializers.CharField(source='get_cashbox_type_display', read_only=True)
    card_name = serializers.CharField(source='card.name', read_only=True)
    # Accept "type" as alias for cashbox_type to match frontend payload
    type = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Cashbox
        fields = (
            'id',
            'name',
            'cashbox_type',
            'type',
            'cashbox_type_display',
            'currency',
            'description',
            'card',
            'card_name',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, attrs):
        """
        Support alias "type" from frontend and normalize casing.
        Removes the alias so it does not get passed to model constructor.
        """
        alias = attrs.pop('type', None)
        if alias and not attrs.get('cashbox_type'):
            attrs['cashbox_type'] = alias

        # Normalize lowercase variants coming from UI
        mapping = {
            'cash_uzs': 'CASH_UZS',
            'cash_usd': 'CASH_USD',
            'card': 'CARD',
            'bank': 'BANK',
        }
        cashbox_type = attrs.get('cashbox_type')
        if cashbox_type in mapping:
            attrs['cashbox_type'] = mapping[cashbox_type]
        
        # Validate currency matches cashbox type
        currency = attrs.get('currency')
        cashbox_type = attrs.get('cashbox_type')
        
        if cashbox_type == 'CASH_UZS' and currency != 'UZS':
            raise serializers.ValidationError({
                'currency': "Naqd UZS turi faqat UZS valyutasi bilan ishlaydi"
            })
        
        if cashbox_type == 'CASH_USD' and currency != 'USD':
            raise serializers.ValidationError({
                'currency': "Naqd USD turi faqat USD valyutasi bilan ishlaydi"
            })
        
        if cashbox_type == 'CARD' and not currency:
            raise serializers.ValidationError({
                'currency': "Karta turi uchun valyuta ko'rsatilishi kerak"
            })

        return super().validate(attrs)


class CashboxOpeningBalanceSerializer(serializers.ModelSerializer):
    """Serializer for cashbox opening balances"""
    cashbox_name = serializers.CharField(source='cashbox.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = CashboxOpeningBalance
        fields = (
            'id',
            'cashbox',
            'cashbox_name',
            'amount',
            'date',
            'created_by',
            'created_by_username',
            'created_at',
            # Legacy fields
            'cashbox_type',
            'balance',
            'currency',
        )
        read_only_fields = ('created_at', 'created_by')


class CurrencyRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencyRate
        fields = ('id', 'rate_date', 'usd_to_uzs', 'created_at')
        read_only_fields = ('created_at',)

class PaymentCardSerializer(serializers.ModelSerializer):
    masked_number = serializers.SerializerMethodField()
    balance_usd = serializers.SerializerMethodField()
    balance_uzs = serializers.SerializerMethodField()

    class Meta:
        model = PaymentCard
        fields = ('id', 'name', 'number', 'holder_name', 'is_active', 'created_at', 'masked_number', 'balance_usd', 'balance_uzs')
        read_only_fields = ('created_at', 'masked_number', 'balance_usd', 'balance_uzs')

    def get_masked_number(self, obj: PaymentCard) -> str:
        return obj.masked_number()

    def get_balance_usd(self, obj: PaymentCard) -> float:
        return float(obj.get_balance_usd())

    def get_balance_uzs(self, obj: PaymentCard) -> float:
        return float(obj.get_balance_uzs())


class PaymentSerializer(serializers.ModelSerializer):
    dealer = DealerSerializer(read_only=True)
    dealer_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('dealers.models', fromlist=['Dealer']).Dealer.objects.all(),
        source='dealer',
        write_only=True,
        required=True
    )
    cashbox = CashboxSerializer(read_only=True)
    cashbox_id = serializers.PrimaryKeyRelatedField(
        queryset=Cashbox.objects.filter(is_active=True),
        source='cashbox',
        write_only=True,
        required=True
    )
    rate = CurrencyRateSerializer(read_only=True)
    rate_id = serializers.PrimaryKeyRelatedField(
        queryset=CurrencyRate.objects.all(), source='rate', write_only=True, allow_null=True
    )
    card = PaymentCardSerializer(read_only=True)
    card_id = serializers.PrimaryKeyRelatedField(
        queryset=PaymentCard.objects.filter(is_active=True), source='card', write_only=True, allow_null=True, required=False
    )
    
    # Approval workflow fields
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_fullname = serializers.SerializerMethodField()
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    approved_by_fullname = serializers.SerializerMethodField()
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            'id',
            'dealer',
            'dealer_id',
            'cashbox',
            'cashbox_id',
            'pay_date',
            'amount',
            'currency',
            'amount_usd',
            'amount_uzs',
            'rate',
            'rate_id',
            'method',
            'card',
            'card_id',
            'note',
            'status',
            'created_by',
            'created_by_username',
            'created_by_fullname',
            'approved_by',
            'approved_by_username',
            'approved_by_fullname',
            'approved_at',
            'receipt_image',
            'receipt_image_url',
            'created_at',
        )
        read_only_fields = (
            'amount_usd',
            'amount_uzs',
            'created_at',
            'created_by',
            'approved_by',
            'approved_at',
            'status',  # Status controlled via approve/reject actions
        )

    def get_created_by_fullname(self, obj: Payment) -> str:
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''

    def get_approved_by_fullname(self, obj: Payment) -> str:
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return ''

    def get_receipt_image_url(self, obj: Payment) -> str:
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return ''

    def validate(self, attrs):
        # Ensure cashbox is provided
        if 'cashbox' not in attrs:
            raise serializers.ValidationError({'cashbox': 'Kassa tanlanishi kerak'})
        
        # When creating/updating, ensure card is present for card payments
        method = attrs.get('method')
        card = attrs.get('card')
        if method == Payment.Method.CARD and not card:
            raise serializers.ValidationError({'card': "Kartadan to'lov bo'lganda karta tanlash majburiy."})
        
        # Validate finance source currency matches payment currency
        source = attrs.get('source')
        currency = attrs.get('currency')
        if source and currency and source.currency != currency:
            raise serializers.ValidationError({
                'source': f"Moliya manbai valyutasi ({source.currency}) to'lov valyutasiga ({currency}) mos kelishi kerak"
            })
        
        return attrs


# ============================================================================
# EXPENSE SERIALIZERS
# ============================================================================


class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Serializer for expense categories"""
    
    class Meta:
        model = ExpenseCategory
        fields = (
            'id',
            'name',
            'code',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer for expenses with full details"""
    
    # Nested read representations
    category_name = serializers.CharField(source='category.name', read_only=True)
    cashbox_name = serializers.CharField(source='cashbox.name', read_only=True)
    cashbox_type = serializers.CharField(source='cashbox.cashbox_type', read_only=True)
    
    # Audit fields
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_fullname = serializers.SerializerMethodField()
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    approved_by_fullname = serializers.SerializerMethodField()
    
    # Write-only fields for creation
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ExpenseCategory.objects.filter(is_active=True),
        source='category',
        write_only=True,
        required=False
    )
    cashbox_id = serializers.PrimaryKeyRelatedField(
        queryset=Cashbox.objects.filter(is_active=True),
        source='cashbox',
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Expense
        fields = (
            'id',
            'expense_date',
            'category',
            'category_id',
            'category_name',
            'cashbox',
            'cashbox_id',
            'cashbox_name',
            'cashbox_type',
            'currency',
            'amount_original',
            'manual_rate',
            'amount_uzs',
            'amount_usd',
            'description',
            'status',
            'created_by',
            'created_by_username',
            'created_by_fullname',
            'created_at',
            'approved_by',
            'approved_by_username',
            'approved_by_fullname',
            'approved_at',
            'updated_at',
        )
        read_only_fields = (
            'amount_uzs',
            'amount_usd',
            'created_at',
            'updated_at',
            'created_by',
            'approved_by',
            'approved_at',
        )
    
    def get_created_by_fullname(self, obj: Expense) -> str:
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''
    
    def get_approved_by_fullname(self, obj: Expense) -> str:
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return ''
    
    def validate(self, attrs):
        """Validate expense data"""
        
        # Get values (might be from source if using _id fields)
        category = attrs.get('category')
        cashbox = attrs.get('cashbox')
        currency = attrs.get('currency')
        status = attrs.get('status', self.instance.status if self.instance else Expense.Status.PENDING)
        
        # Validate category is active
        if category and not category.is_active:
            raise serializers.ValidationError({
                'category': "Faol bo'lmagan xarajat turini tanlash mumkin emas"
            })
        
        # Validate cashbox is active
        if cashbox and not cashbox.is_active:
            raise serializers.ValidationError({
                'cashbox': "Faol bo'lmagan kassani tanlash mumkin emas"
            })
        
        # Validate currency matches cashbox currency
        if cashbox and currency and cashbox.currency != currency:
            raise serializers.ValidationError({
                'currency': f"Valyuta kassaning valyutasiga ({cashbox.currency}) mos kelishi kerak"
            })
        
        # Prevent modification of critical fields after approval
        if self.instance and self.instance.status == Expense.Status.APPROVED:
            immutable_fields = [
                'category', 'cashbox', 'currency', 'amount_original',
                'manual_rate', 'expense_date'
            ]
            for field in immutable_fields:
                if field in attrs and getattr(self.instance, field) != attrs[field]:
                    raise serializers.ValidationError({
                        field: "Tasdiqlangan xarajatning asosiy ma'lumotlarini o'zgartirish mumkin emas"
                    })
        
        return attrs


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating expenses"""
    
    class Meta:
        model = Expense
        fields = (
            'expense_date',
            'category',
            'cashbox',
            'currency',
            'amount_original',
            'manual_rate',
            'description',
        )
    
    def validate(self, attrs):
        """Validate new expense data"""
        category = attrs.get('category')
        cashbox = attrs.get('cashbox')
        currency = attrs.get('currency')
        
        # Validate category is active
        if category and not category.is_active:
            raise serializers.ValidationError({
                'category': "Faol bo'lmagan xarajat turini tanlash mumkin emas"
            })
        
        # Validate cashbox is active
        if cashbox and not cashbox.is_active:
            raise serializers.ValidationError({
                'cashbox': "Faol bo'lmagan kassani tanlash mumkin emas"
            })
        
        # Validate currency matches cashbox currency
        if cashbox and currency and cashbox.currency != currency:
            raise serializers.ValidationError({
                'currency': f"Valyuta kassaning valyutasiga ({cashbox.currency}) mos kelishi kerak"
            })
        
        return attrs





