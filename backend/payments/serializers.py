from rest_framework import serializers

from .models import CurrencyRate, Payment, PaymentCard


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
            'created_at',
        )
        read_only_fields = ('amount_usd', 'amount_uzs', 'created_at')

    def validate(self, attrs):
        # When creating/updating, ensure card is present for card payments
        method = attrs.get('method')
        card = attrs.get('card')
        if method == Payment.Method.CARD and not card:
            raise serializers.ValidationError({'card': "Kartadan to‘lov bo‘lganda karta tanlash majburiy."})
        return attrs
