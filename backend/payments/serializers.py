from rest_framework import serializers

from .models import CurrencyRate, Payment


class CurrencyRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencyRate
        fields = ('id', 'rate_date', 'usd_to_uzs', 'created_at')
        read_only_fields = ('created_at',)


class PaymentSerializer(serializers.ModelSerializer):
    rate = CurrencyRateSerializer(read_only=True)
    rate_id = serializers.PrimaryKeyRelatedField(
        queryset=CurrencyRate.objects.all(), source='rate', write_only=True, allow_null=True
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
            'rate',
            'rate_id',
            'method',
            'note',
            'created_at',
        )
        read_only_fields = ('amount_usd', 'created_at')
