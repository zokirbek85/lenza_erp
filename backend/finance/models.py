from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
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
    opening_balance_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0'),
        help_text=_('Opening balance amount')
    )
    opening_balance_date = models.DateField(
        null=True,
        blank=True,
        help_text=_('Opening balance date (required if amount > 0)')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ('type', 'currency', 'name')
        unique_together = ('type', 'currency', 'name')
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.name} ({self.currency})"
    
    def clean(self):
        """Validate business rules"""
        errors = {}
        
        # Opening balance amount > 0 bo'lsa, date majburiy
        if self.opening_balance_amount and self.opening_balance_amount > 0 and not self.opening_balance_date:
            errors['opening_balance_date'] = _('Opening balance date is required when amount is set')
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        # Validate before save
        self.full_clean()
        
        is_new = self.pk is None
        old_opening_balance = None
        old_opening_date = None
        
        # Track changes to opening balance
        if not is_new:
            try:
                old_account = FinanceAccount.objects.get(pk=self.pk)
                old_opening_balance = old_account.opening_balance_amount
                old_opening_date = old_account.opening_balance_date
            except FinanceAccount.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        # Create or update opening balance transaction
        if self.opening_balance_amount and self.opening_balance_amount > 0:
            self._sync_opening_balance_transaction(
                is_new=is_new,
                old_amount=old_opening_balance,
                old_date=old_opening_date
            )
    
    def _sync_opening_balance_transaction(self, is_new, old_amount, old_date):
        """Create or update opening balance transaction"""
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get or create system user for opening balance transactions
        system_user = User.objects.filter(is_superuser=True).first()
        
        # Check if opening balance transaction exists
        opening_tx = self.transactions.filter(
            type='opening_balance'
        ).first()
        
        if opening_tx:
            # Update existing transaction
            opening_tx.amount = self.opening_balance_amount
            opening_tx.date = self.opening_balance_date
            opening_tx.currency = self.currency
            opening_tx.save()
        else:
            # Create new opening balance transaction
            FinanceTransaction.objects.create(
                type='opening_balance',
                account=self,
                date=self.opening_balance_date,
                currency=self.currency,
                amount=self.opening_balance_amount,
                category='Opening Balance',
                comment='Automatically created opening balance',
                status=FinanceTransaction.TransactionStatus.APPROVED,
                created_by=system_user,
                approved_by=system_user,
                approved_at=timezone.now(),
                dealer=None
            )
    
    @property
    def balance(self):
        """Calculate account balance including opening balance and approved transactions"""
        from django.db.models import Sum
        
        # Get all approved transactions (including opening_balance)
        approved_transactions = self.transactions.filter(
            status=FinanceTransaction.TransactionStatus.APPROVED
        )
        
        # Income: opening balance + regular income + currency exchange in
        income = approved_transactions.filter(
            type__in=[
                FinanceTransaction.TransactionType.OPENING_BALANCE,
                FinanceTransaction.TransactionType.INCOME,
                FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_IN
            ]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Expense: regular expense + currency exchange out
        expense = approved_transactions.filter(
            type__in=[
                FinanceTransaction.TransactionType.EXPENSE,
                FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_OUT
            ]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        return income - expense


class FinanceTransaction(models.Model):
    """
    Moliya operatsiyalari - kirim va chiqimlar
    """
    
    class TransactionType(models.TextChoices):
        INCOME = 'income', _('Income')
        EXPENSE = 'expense', _('Expense')
        OPENING_BALANCE = 'opening_balance', _('Opening Balance')
        CURRENCY_EXCHANGE_OUT = 'currency_exchange_out', _('Currency Exchange Out')
        CURRENCY_EXCHANGE_IN = 'currency_exchange_in', _('Currency Exchange In')
    
    class TransactionStatus(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        APPROVED = 'approved', _('Approved')
        CANCELLED = 'cancelled', _('Cancelled')
    
    type = models.CharField(max_length=30, choices=TransactionType.choices)
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
    related_account = models.ForeignKey(
        FinanceAccount,
        on_delete=models.PROTECT,
        related_name='related_transactions',
        null=True,
        blank=True,
        help_text=_('Related account for currency exchange transactions')
    )
    exchange_rate = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        null=True,
        blank=True,
        help_text=_('Exchange rate used for currency conversion')
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
    amount_uzs = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
        help_text=_('Amount in UZS equivalent (auto-calculated)')
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
        
        # Opening balance transactions skip normal validation
        if self.type == self.TransactionType.OPENING_BALANCE:
            # Opening balance must not have dealer
            if self.dealer:
                errors['dealer'] = _('Opening balance must not have dealer')
            # Currency must match account
            if self.account and self.account.currency != self.currency:
                errors['currency'] = _(f'Currency must match account currency ({self.account.currency})')
        
        # Currency exchange transactions validation
        elif self.type in [self.TransactionType.CURRENCY_EXCHANGE_OUT, self.TransactionType.CURRENCY_EXCHANGE_IN]:
            # Must have related_account
            if not self.related_account:
                errors['related_account'] = _('Related account is required for currency exchange')
            
            # Must have exchange_rate
            if not self.exchange_rate or self.exchange_rate <= 0:
                errors['exchange_rate'] = _('Valid exchange rate is required')
            
            # Must not have dealer
            if self.dealer:
                errors['dealer'] = _('Currency exchange must not have dealer')
            
            # Currency must match account
            if self.account and self.account.currency != self.currency:
                errors['currency'] = _(f'Currency must match account currency ({self.account.currency})')
        
        else:
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
        
        # Validate exchange rate
        if self.exchange_rate is not None and self.exchange_rate <= 0:
            raise ValidationError({'exchange_rate': _('Exchange rate must be greater than 0')})
        
        # Initialize amounts if not set
        if self.amount_usd is None:
            self.amount_usd = Decimal('0')
        if self.amount_uzs is None:
            self.amount_uzs = Decimal('0')
        
        # Get exchange rate if not provided
        if not self.exchange_rate:
            from core.utils.currency import get_exchange_rate
            rate, rate_date = get_exchange_rate(self.date)
            self.exchange_rate = rate
            self.exchange_rate_date = rate_date
        elif not self.exchange_rate_date:
            self.exchange_rate_date = self.date
        
        # Calculate both USD and UZS amounts based on currency
        if self.currency == 'USD':
            # INCOME: USD currency
            # amount = original USD
            # amount_usd = same as amount
            # amount_uzs = amount * exchange_rate
            self.amount_usd = self.amount
            self.amount_uzs = (self.amount * self.exchange_rate).quantize(Decimal('0.01'))
        elif self.currency == 'UZS':
            # INCOME: UZS currency
            # amount = original UZS
            # amount_uzs = same as amount
            # amount_usd = amount / exchange_rate
            self.amount_uzs = self.amount
            self.amount_usd = (self.amount / self.exchange_rate).quantize(Decimal('0.01'))
        
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


class ExpenseCategory(models.Model):
    """
    Chiqim kategoriyalari
    - Global: barcha userlar ko'radi, faqat admin/accountant boshqaradi
    - User-specific: faqat category egasi ko'radi va boshqaradi
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expense_categories',
        null=True,
        blank=True,
        help_text=_('Category owner (null for global categories)')
    )
    is_global = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('Global categories are visible to all users')
    )
    name = models.CharField(
        max_length=100,
        help_text=_('Category name')
    )
    color = models.CharField(
        max_length=7,
        default='#6B7280',
        help_text=_('Hex color code, e.g. #FF5733')
    )
    icon = models.CharField(
        max_length=50,
        default='📁',
        help_text=_('Icon emoji or name')
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_('Active status')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ('name',)
        verbose_name = _('Expense Category')
        verbose_name_plural = _('Expense Categories')
        constraints = [
            models.UniqueConstraint(
                fields=['name'],
                condition=models.Q(is_global=True),
                name='unique_global_category_name'
            ),
            models.UniqueConstraint(
                fields=['user', 'name'],
                condition=models.Q(is_global=False),
                name='unique_user_category_name'
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['is_global', 'is_active']),
        ]
    
    def __str__(self):
        prefix = '🌍 ' if self.is_global else ''
        return f"{prefix}{self.icon} {self.name}"
    
    def clean(self):
        """Validate category"""
        errors = {}
        
        # Global category must not have user
        if self.is_global and self.user is not None:
            errors['user'] = _('Global category must not have a user')
        
        # User category must have user
        if not self.is_global and self.user is None:
            errors['user'] = _('User category must have a user')
        
        # Name length validation
        if self.name and len(self.name) < 3:
            errors['name'] = _('Category name must be at least 3 characters')
        
        # Color format validation
        if self.color:
            import re
            if not re.match(r'^#[0-9A-Fa-f]{6}$', self.color):
                errors['color'] = _('Invalid color format. Use hex format like #FF5733')
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# Default global categories (created by migration)
DEFAULT_GLOBAL_CATEGORIES = [
    {'name': 'Maosh', 'icon': '💰', 'color': '#3B82F6'},
    {'name': 'Ijara', 'icon': '🏠', 'color': '#8B5CF6'},
    {'name': 'Kommunal xizmatlar', 'icon': '💡', 'color': '#F59E0B'},
    {'name': 'Materiallar', 'icon': '📦', 'color': '#10B981'},
    {'name': 'Transport', 'icon': '🚗', 'color': '#EF4444'},
    {'name': 'Marketing', 'icon': '📢', 'color': '#EC4899'},
    {'name': 'Uskunalar', 'icon': '🔧', 'color': '#6366F1'},
    {'name': "Ta'mirlash", 'icon': '🛠️', 'color': '#F97316'},
    {'name': 'Boshqa', 'icon': '📝', 'color': '#6B7280'},
]


# Default user-specific categories (for new users)
DEFAULT_USER_CATEGORIES = [
    {'name': 'Shaxsiy', 'icon': '👤', 'color': '#6366F1'},
]


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_expense_categories(sender, instance, created, **kwargs):
    """Create default user-specific categories for new users"""
    if created:
        for category_data in DEFAULT_USER_CATEGORIES:
            ExpenseCategory.objects.create(
                user=instance,
                is_global=False,
                **category_data
            )
