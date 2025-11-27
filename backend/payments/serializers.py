from rest_framework import serializers

from .models import Cashbox, CashboxOpeningBalance, CurrencyRate, Payment, PaymentCard
from dealers.serializers import DealerSerializer


class CashboxSerializer(serializers.ModelSerializer):
    """Serializer for Cashbox model"""
    cashbox_type_display = serializers.CharField(source='get_cashbox_type_display', read_only=True)
    card_name = serializers.CharField(source='card.name', read_only=True)
    
    class Meta:
        model = Cashbox
        fields = (
            'id',
            'name',
            'cashbox_type',
            'cashbox_type_display',
            'currency',
            'card',
            'card_name',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


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
    
    def validate(self, attrs):
        """Ensure cashbox is provided"""
        if 'cashbox' not in attrs:
            raise serializers.ValidationError({'cashbox': 'Kassa tanlanishi kerak'})
        return attrs


class CashboxSummarySerializer(serializers.Serializer):
    """
    Summary serializer for cashbox balance with history.
    Used by /api/cashbox/summary/ endpoint.
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    cashbox_type = serializers.CharField(source='cashbox_type')
    type = serializers.CharField(source='cashbox_type')
    type_display = serializers.SerializerMethodField()
    currency = serializers.CharField()
    is_active = serializers.BooleanField()

    # Balance calculation
    opening_balance = serializers.DecimalField(max_digits=18, decimal_places=2)
    income_sum = serializers.DecimalField(max_digits=18, decimal_places=2)
    expense_sum = serializers.DecimalField(max_digits=18, decimal_places=2)
    balance = serializers.DecimalField(max_digits=18, decimal_places=2)

    # Optional: minimal history for chart
    history = serializers.ListField(child=serializers.DictField(), required=False)

    def get_type_display(self, obj):
        """Get human-readable cashbox type"""
        return obj.get_cashbox_type_display()

    def to_representation(self, instance):
        """Calculate balance and add to representation"""
        # Calculate balance breakdown
        balance_data = instance.calculate_balance(return_detailed=True)

        # Build representation
        data = {
            'id': instance.id,
            'name': instance.name,
            'cashbox_type': instance.cashbox_type,
            'type': instance.cashbox_type,  # Alias for frontend compatibility
            'type_display': instance.get_cashbox_type_display(),
            'currency': instance.currency,
            'is_active': instance.is_active,
            'opening_balance': balance_data['opening_balance'],
            'income_sum': balance_data['income_sum'],
            'expense_sum': balance_data['expense_sum'],
            'balance': balance_data['balance'],
            'history': []  # Populated separately if needed
        }

        return data


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
        # When creating/updating, ensure card is present for card payments
        method = attrs.get('method')
        card = attrs.get('card')
        if method == Payment.Method.CARD and not card:
            raise serializers.ValidationError({'card': "Kartadan to'lov bo'lganda karta tanlash majburiy."})
        return attrs
