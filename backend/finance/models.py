from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class ExchangeRate(models.Model):
    """
    USD to UZS exchange rates
    Used for currency conversion in transactions
    """
    rate_date = models.DateField(unique=True, db_index=True)
    usd_to_uzs = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_('Exchange rate: 1 USD = X UZS')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ('-rate_date',)
        verbose_name = _('Exchange Rate')
        verbose_name_plural = _('Exchange Rates')
    
    def __str__(self):
        return f"{self.rate_date}: 1 USD = {self.usd_to_uzs} UZS"


class FinanceAccount(models.Model):
    """
    Moliya hisoblari - kassa, karta, bank
    """
    
    class AccountType(models.TextChoices):
        CASH = 'cash', _('Cash')
        CARD = 'card', _('Card')
        BANK = 'bank', _('Bank')
    
    class Currency(models.TextChoices):
        UZS = 'UZS', _('UZS')
        USD = 'USD', _('USD')
    
    type = models.CharField(max_length=10, choices=AccountType.choices)
    currency = models.CharField(max_length=3, choices=Currency.choices)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ('type', 'currency', 'name')
        unique_together = ('type', 'currency', 'name')
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.name} ({self.currency})"
    
    @property
    def balance(self):
        """Calculate account balance from approved transactions"""
        from django.db.models import Sum
        approved_transactions = self.transactions.filter(
            status=FinanceTransaction.TransactionStatus.APPROVED
        )
        income = approved_transactions.filter(
            type=FinanceTransaction.TransactionType.INCOME
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        expense = approved_transactions.filter(
            type=FinanceTransaction.TransactionType.EXPENSE
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        return income - expense


class FinanceTransaction(models.Model):
    """
    Moliya operatsiyalari - kirim va chiqimlar
    """
    
    class TransactionType(models.TextChoices):
        INCOME = 'income', _('Income')
        EXPENSE = 'expense', _('Expense')
    
    class TransactionStatus(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        APPROVED = 'approved', _('Approved')
        CANCELLED = 'cancelled', _('Cancelled')
    
    type = models.CharField(max_length=10, choices=TransactionType.choices)
    dealer = models.ForeignKey(
        'dealers.Dealer',
        on_delete=models.PROTECT,
        related_name='finance_transactions',
        null=True,
        blank=True,
        help_text=_('Required for income, null for expense')
    )
    account = models.ForeignKey(
        FinanceAccount,
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    date = models.DateField(default=timezone.now)
    currency = models.CharField(
        max_length=3,
        choices=FinanceAccount.Currency.choices
    )
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        help_text=_('Amount in original currency')
    )
    amount_usd = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
        help_text=_('Amount in USD equivalent (auto-calculated)')
    )
    exchange_rate = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        help_text=_('Exchange rate UZS to USD (for UZS transactions)')
    )
    exchange_rate_date = models.DateField(
        null=True,
        blank=True,
        help_text=_('Date when exchange rate was taken')
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text=_('Required for expense transactions')
    )
    comment = models.TextField(blank=True)
    status = models.CharField(
        max_length=10,
        choices=TransactionStatus.choices,
        default=TransactionStatus.DRAFT
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_finance_transactions',
        null=True
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='approved_finance_transactions',
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ('-date', '-created_at')
        indexes = [
            models.Index(fields=['type', 'status']),
            models.Index(fields=['dealer', 'status']),
            models.Index(fields=['date']),
            models.Index(fields=['account']),
        ]
    
    def __str__(self):
        type_label = self.get_type_display()
        dealer_info = f" - {self.dealer.name}" if self.dealer else ""
        return f"{type_label}{dealer_info}: {self.amount} {self.currency} ({self.get_status_display()})"
    
    def clean(self):
        """Validate business rules"""
        errors = {}
        
        # Kirim uchun dealer majburiy
        if self.type == self.TransactionType.INCOME and not self.dealer:
            errors['dealer'] = _('Dealer is required for income transactions')
        
        # Chiqim uchun dealer bo'lmasligi kerak
        if self.type == self.TransactionType.EXPENSE and self.dealer:
            errors['dealer'] = _('Dealer must be null for expense transactions')
        
        # Chiqim uchun category majburiy
        if self.type == self.TransactionType.EXPENSE and not self.category:
            errors['category'] = _('Category is required for expense transactions')
        
        # Currency va account currency mos bo'lishi kerak
        if self.account and self.account.currency != self.currency:
            errors['currency'] = _(f'Currency must match account currency ({self.account.currency})')
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        # Validatsiya
        self.full_clean()
        
        # Initialize amount_usd if not set
        if self.amount_usd is None:
            self.amount_usd = Decimal('0')
        
        # USD miqdorini hisoblash
        if self.currency == 'USD':
            self.amount_usd = self.amount
            self.exchange_rate = None
            self.exchange_rate_date = None
        elif self.currency == 'UZS':
            # CurrencyRate model removed from system
            # For UZS transactions, use manual exchange_rate or default conversion
            if self.exchange_rate and self.exchange_rate > 0:
                # Use manually provided exchange rate
                self.amount_usd = (self.amount / self.exchange_rate).quantize(Decimal('0.01'))
                if not self.exchange_rate_date:
                    self.exchange_rate_date = self.date
            else:
                # No exchange rate provided - set amount_usd same as amount (will need manual correction)
                self.amount_usd = self.amount
                self.exchange_rate = None
                self.exchange_rate_date = None
        
        super().save(*args, **kwargs)
    
    def approve(self, user):
        """Approve transaction"""
        if self.status == self.TransactionStatus.APPROVED:
            raise ValidationError(_('Transaction is already approved'))
        
        self.status = self.TransactionStatus.APPROVED
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
    
    def cancel(self):
        """Cancel transaction"""
        if self.status == self.TransactionStatus.CANCELLED:
            raise ValidationError(_('Transaction is already cancelled'))
        
        self.status = self.TransactionStatus.CANCELLED
        self.save(update_fields=['status', 'updated_at'])
