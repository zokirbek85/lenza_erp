from django.conf import settings
from django.db import models
from django.utils import timezone
from decimal import Decimal


class LedgerAccount(models.Model):
    """
    Ledger accounts for cash/bank/card tracking.
    - type: 'cash' | 'bank' | 'card'
    - CASH: main cash register
    - BANK: general bank account
    - CARD: linked to PaymentCard (one account per card)
    """
    TYPE_CHOICES = (
        ('cash', 'Cash'),
        ('bank', 'Bank'),
        ('card', 'Card'),
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    payment_card = models.OneToOneField(
        'payments.PaymentCard',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='ledger_account'
    )
    currency = models.CharField(max_length=3, default='USD')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('type', 'payment_card')]
        ordering = ('type', 'name')

    def __str__(self):
        return f"{self.name} ({self.type})"


class LedgerEntry(models.Model):
    """
    Simplified ledger entries: +amount = income, -amount = expense.
    """
    ENTRY_KIND = (
        ('payment_in', 'Payment In'),
        ('expense_out', 'Expense Out'),
        ('adjustment', 'Adjustment'),
    )
    account = models.ForeignKey(
        LedgerAccount,
        on_delete=models.PROTECT,
        related_name='entries'
    )
    kind = models.CharField(max_length=20, choices=ENTRY_KIND)
    ref_app = models.CharField(max_length=32, blank=True)
    ref_id = models.CharField(max_length=64, blank=True)
    date = models.DateField(default=timezone.now)
    currency = models.CharField(max_length=3, default='USD')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    amount_usd = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    note = models.CharField(max_length=255, blank=True)
    reconciled = models.BooleanField(default=False)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='ledger_entries_reconciled'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name='ledger_entries_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['ref_app', 'ref_id']),
            models.Index(fields=['account', 'date']),
        ]
        ordering = ['-date', '-id']

    def __str__(self):
        sign = '+' if self.amount >= 0 else ''
        return f"{self.account.name}: {sign}{self.amount} {self.currency} ({self.kind})"

    @staticmethod
    def to_usd(amount: Decimal, currency: str, on_date):
        """Convert amount to USD using CurrencyRate."""
        if currency == 'USD':
            return amount
        from payments.models import CurrencyRate
        # Get rate on or before the given date
        rate = CurrencyRate.objects.filter(rate_date__lte=on_date).order_by('-rate_date').first()
        if not rate:
            # If no historical rate, get the latest available
            rate = CurrencyRate.objects.order_by('-rate_date').first()
        
        if not rate:
            # Ultimate fallback
            usd_to_uzs = Decimal('12500')
        else:
            usd_to_uzs = Decimal(str(rate.usd_to_uzs))
        
        if currency == 'UZS':
            return (amount / usd_to_uzs).quantize(Decimal('0.01'))
        return amount
