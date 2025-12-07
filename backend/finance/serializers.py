from decimal import Decimal

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from dealers.models import Dealer
from dealers.serializers import DealerSerializer

from .models import ExchangeRate, FinanceAccount, FinanceTransaction


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = ('id', 'rate_date', 'usd_to_uzs', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class FinanceAccountSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    currency_display = serializers.CharField(source='get_currency_display', read_only=True)
    balance = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False
    )
    
    class Meta:
        model = FinanceAccount
        fields = (
            'id',
            'type',
            'type_display',
            'currency',
            'currency_display',
            'name',
            'is_active',
            'opening_balance_amount',
            'opening_balance_date',
            'balance',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at', 'balance')
    
    def validate(self, data):
        """Validate account data"""
        # Cash accountlarni oddiy foydalanuvchi yarata olmaydi
        request = self.context.get('request')
        if request and data.get('type') == 'cash':
            user = request.user
            if not (user.is_superuser or getattr(user, 'role', None) in ['admin', 'accountant']):
                raise serializers.ValidationError({
                    'type': _('Siz cash account yarata olmaysiz')
                })
        
        # Opening balance amount > 0 bo'lsa, date majburiy
        opening_amount = data.get('opening_balance_amount')
        opening_date = data.get('opening_balance_date')
        
        if opening_amount and opening_amount > 0 and not opening_date:
            raise serializers.ValidationError({
                'opening_balance_date': _('Opening balance date is required when amount is set')
            })
        
        return data


class FinanceTransactionSerializer(serializers.ModelSerializer):
    dealer_detail = DealerSerializer(source='dealer', read_only=True)
    dealer_name = serializers.CharField(source='dealer.name', read_only=True, allow_null=True)
    account_detail = FinanceAccountSerializer(source='account', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    
    # amount_usd, amount_uzs, exchange_rate read-only, avtomatik hisoblanadi
    amount_usd = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False
    )
    amount_uzs = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False
    )
    exchange_rate = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        required=False,
        allow_null=True,
        coerce_to_string=False
    )
    exchange_rate_date = serializers.DateField(read_only=True, required=False, allow_null=True)
    
    class Meta:
        model = FinanceTransaction
        fields = (
            'id',
            'type',
            'type_display',
            'dealer',
            'dealer_name',
            'dealer_detail',
            'account',
            'account_name',
            'account_detail',
            'date',
            'currency',
            'amount',
            'amount_usd',
            'amount_uzs',
            'exchange_rate',
            'exchange_rate_date',
            'category',
            'comment',
            'status',
            'status_display',
            'created_by',
            'created_by_name',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'amount_usd',
            'amount_uzs',
            'exchange_rate',
            'exchange_rate_date',
            'created_by',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at',
        )
    
    def validate(self, data):
        """Validate transaction data"""
        transaction_type = data.get('type', getattr(self.instance, 'type', None))
        dealer = data.get('dealer', getattr(self.instance, 'dealer', None))
        category = data.get('category', getattr(self.instance, 'category', None))
        account = data.get('account', getattr(self.instance, 'account', None))
        currency = data.get('currency', getattr(self.instance, 'currency', None))
        
        errors = {}
        
        # Kirim uchun dealer majburiy
        if transaction_type == FinanceTransaction.TransactionType.INCOME:
            if not dealer:
                errors['dealer'] = _('Kirim uchun dealer majburiy')
            if 'category' in data:
                # Category kirim uchun kerak emas
                data.pop('category')
        
        # Chiqim uchun dealer bo'lmasligi va category majburiy
        if transaction_type == FinanceTransaction.TransactionType.EXPENSE:
            if dealer:
                errors['dealer'] = _('Chiqimda dealer bo\'lmasligi kerak')
            if not category:
                errors['category'] = _('Chiqim uchun category majburiy')
        
        # Account currency bilan transaction currency mos kelishi kerak
        if account and currency:
            if account.currency != currency:
                errors['currency'] = _(
                    f'Valyuta account valyutasiga mos kelishi kerak ({account.currency})'
                )
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data
    
    def create(self, validated_data):
        """Create transaction with created_by"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        # Status default draft
        if 'status' not in validated_data:
            validated_data['status'] = FinanceTransaction.TransactionStatus.DRAFT
        
        return super().create(validated_data)


class CashSummarySerializer(serializers.Serializer):
    """Kassa umumiy ko'rinish uchun serializer"""
    account_id = serializers.IntegerField()
    account_name = serializers.CharField()
    account_type = serializers.CharField()
    account_type_display = serializers.CharField()
    currency = serializers.CharField()
    income_total = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    expense_total = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    balance = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    is_active = serializers.BooleanField()


class CashSummaryResponseSerializer(serializers.Serializer):
    """Kassa summary response"""
    accounts = CashSummarySerializer(many=True)
    total_balance_uzs = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_balance_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_income_uzs = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_income_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_expense_uzs = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)
    total_expense_usd = serializers.DecimalField(max_digits=18, decimal_places=2, coerce_to_string=False)


class CurrencyTransferSerializer(serializers.Serializer):
    """Currency exchange/transfer from USD to UZS"""
    from_account_id = serializers.IntegerField()
    to_account_id = serializers.IntegerField()
    usd_amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal('0.01'))
    rate = serializers.DecimalField(max_digits=18, decimal_places=4, min_value=Decimal('0.0001'))
    date = serializers.DateField()
    comment = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate(self, data):
        """Validate currency transfer"""
        from_account_id = data.get('from_account_id')
        to_account_id = data.get('to_account_id')
        usd_amount = data.get('usd_amount')
        
        # Accounts must be different
        if from_account_id == to_account_id:
            raise serializers.ValidationError({
                'to_account_id': _('Source and destination accounts must be different')
            })
        
        # Get accounts
        try:
            from_account = FinanceAccount.objects.get(id=from_account_id)
        except FinanceAccount.DoesNotExist:
            raise serializers.ValidationError({
                'from_account_id': _('Source account not found')
            })
        
        try:
            to_account = FinanceAccount.objects.get(id=to_account_id)
        except FinanceAccount.DoesNotExist:
            raise serializers.ValidationError({
                'to_account_id': _('Destination account not found')
            })
        
        # Validate currencies
        if from_account.currency != 'USD':
            raise serializers.ValidationError({
                'from_account_id': _('Source account must be USD')
            })
        
        if to_account.currency != 'UZS':
            raise serializers.ValidationError({
                'to_account_id': _('Destination account must be UZS')
            })
        
        # Check sufficient balance in USD account
        if from_account.balance < usd_amount:
            raise serializers.ValidationError({
                'usd_amount': _(f'Insufficient balance in USD account. Available: {from_account.balance} USD')
            })
        
        # Store accounts in validated data for later use
        data['from_account'] = from_account
        data['to_account'] = to_account
        
        return data
