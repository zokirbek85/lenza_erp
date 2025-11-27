from rest_framework import serializers

from .models import Cashbox, CashboxOpeningBalance, CurrencyRate, Payment, PaymentCard
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
    
    def validate(self, attrs):
        """Ensure cashbox is provided"""
        if 'cashbox' not in attrs:
            raise serializers.ValidationError({'cashbox': 'Kassa tanlanishi kerak'})
        return attrs


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
