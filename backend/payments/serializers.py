from rest_framework import serializers

from .models import CashboxOpeningBalance, CurrencyRate, Payment, PaymentCard


class CashboxOpeningBalanceSerializer(serializers.ModelSerializer):
    """Serializer for cashbox opening balances"""
    cashbox_type_display = serializers.CharField(source='get_cashbox_type_display', read_only=True)

    class Meta:
        model = CashboxOpeningBalance
        fields = ('id', 'cashbox_type', 'cashbox_type_display', 'balance', 'currency', 'date', 'created_at')
        read_only_fields = ('created_at',)


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
