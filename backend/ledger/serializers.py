from rest_framework import serializers
from .models import LedgerAccount, LedgerEntry


class LedgerAccountSerializer(serializers.ModelSerializer):
    card_name = serializers.CharField(source='payment_card.name', read_only=True, allow_null=True)
    
    class Meta:
        model = LedgerAccount
        fields = ['id', 'name', 'type', 'currency', 'is_active', 'payment_card', 'card_name', 'created_at']
        read_only_fields = ['created_at']


class LedgerEntrySerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)
    reconciled_by_name = serializers.CharField(source='reconciled_by.full_name', read_only=True, allow_null=True)
    amount = serializers.SerializerMethodField()
    amount_usd = serializers.SerializerMethodField()
    
    class Meta:
        model = LedgerEntry
        fields = [
            'id', 'account', 'account_name', 'kind', 'ref_app', 'ref_id',
            'date', 'currency', 'amount', 'amount_usd', 'note',
            'reconciled', 'reconciled_at', 'reconciled_by', 'reconciled_by_name',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['created_at', 'amount_usd', 'reconciled_at', 'reconciled_by']

    def get_amount(self, obj):
        """Return amount as float to ensure compatibility with frontend."""
        try:
            return float(obj.amount) if obj.amount is not None else 0.0
        except (ValueError, TypeError):
            return 0.0

    def get_amount_usd(self, obj):
        """Return amount_usd as float to ensure compatibility with frontend."""
        try:
            return float(obj.amount_usd) if obj.amount_usd is not None else 0.0
        except (ValueError, TypeError):
            return 0.0

    def create(self, validated_data):
        # Calculate amount_usd on create
        from .models import LedgerEntry
        amount = validated_data.get('amount')
        currency = validated_data.get('currency', 'USD')
        date = validated_data.get('date')
        validated_data['amount_usd'] = LedgerEntry.to_usd(amount, currency, date)
        return super().create(validated_data)
