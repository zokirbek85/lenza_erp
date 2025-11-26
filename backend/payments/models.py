from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Cashbox(models.Model):
    """
    Unified cashbox model - represents cards, cash UZS, cash USD.
    Each cashbox has its own balance tracking.
    """
    TYPE_CARD = "CARD"
    TYPE_CASH_UZS = "CASH_UZS"
    TYPE_CASH_USD = "CASH_USD"

    CASHBOX_TYPES = [
        (TYPE_CARD, "Card"),
        (TYPE_CASH_UZS, "Cash UZS"),
        (TYPE_CASH_USD, "Cash USD"),
    ]

    CURRENCY_USD = "USD"
    CURRENCY_UZS = "UZS"

    CURRENCY_CHOICES = [
        (CURRENCY_USD, "USD"),
        (CURRENCY_UZS, "UZS"),
    ]

    name = models.CharField(max_length=100, verbose_name="Nomi")  # e.g. "Karta-1", "Naqd UZS"
    cashbox_type = models.CharField(max_length=20, choices=CASHBOX_TYPES, verbose_name="Turi", db_column='type')
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, verbose_name="Valyuta")
    
    # Link to PaymentCard if type=CARD
    card = models.OneToOneField(
        'payments.PaymentCard',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cashbox_link',
        verbose_name="Bog'langan karta"
    )
    
    is_active = models.BooleanField(default=True, verbose_name="Faolmi")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['cashbox_type', 'name']
        verbose_name = "Kassa"
        verbose_name_plural = "Kassalar"

    def __str__(self):
        return f"{self.name} ({self.get_cashbox_type_display()}) - {self.currency}"

    def clean(self):
        """Validate that currency matches type"""
        from django.core.exceptions import ValidationError
        
        if self.cashbox_type == self.TYPE_CARD and not self.currency:
            raise ValidationError("Karta turi uchun valyuta ko'rsatilishi kerak")
        
        if self.cashbox_type == self.TYPE_CASH_UZS and self.currency != self.CURRENCY_UZS:
            raise ValidationError("Naqd UZS turi faqat UZS valyutasi bilan ishlaydi")
        
        if self.cashbox_type == self.TYPE_CASH_USD and self.currency != self.CURRENCY_USD:
            raise ValidationError("Naqd USD turi faqat USD valyutasi bilan ishlaydi")

    def get_latest_opening_balance(self):
        """Get the most recent opening balance for this cashbox"""
        return self.opening_balances.order_by('-date', '-created_at').first()

    def calculate_balance(self, up_to_date=None, return_detailed=False):
        """
        Calculate current balance:
        balance = opening_balance + incomes - expenses
        
        Args:
            up_to_date: Calculate balance up to this date (inclusive)
            return_detailed: If True, return dict with breakdown, else return balance amount
        """
        from decimal import Decimal
        from expenses.models import Expense
        
        opening = self.get_latest_opening_balance()
        
        if not opening:
            opening_amount = Decimal('0.00')
            opening_date = None
        else:
            opening_amount = opening.amount
            opening_date = opening.date
        
        # Filter payments (incomes)
        income_filter = {
            'cashbox': self,
            'status__in': [Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        }
        if opening_date:
            income_filter['pay_date__gte'] = opening_date
        if up_to_date:
            income_filter['pay_date__lte'] = up_to_date
        
        # Use correct currency amount field
        if self.currency == self.CURRENCY_USD:
            income_sum = Payment.objects.filter(**income_filter).aggregate(
                total=models.Sum('amount_usd')
            )['total'] or Decimal('0.00')
        else:
            income_sum = Payment.objects.filter(**income_filter).aggregate(
                total=models.Sum('amount_uzs')
            )['total'] or Decimal('0.00')
        
        # Filter expenses
        expense_filter = {
            'cashbox': self,
            'status': Expense.STATUS_APPROVED
        }
        if opening_date:
            expense_filter['date__gte'] = opening_date
        if up_to_date:
            expense_filter['date__lte'] = up_to_date
        
        # Use correct currency amount field
        if self.currency == self.CURRENCY_USD:
            expense_sum = Expense.objects.filter(**expense_filter).aggregate(
                total=models.Sum('amount_usd')
            )['total'] or Decimal('0.00')
        else:
            expense_sum = Expense.objects.filter(**expense_filter).aggregate(
                total=models.Sum('amount_uzs')
            )['total'] or Decimal('0.00')
        
        balance = opening_amount + income_sum - expense_sum
        
        if return_detailed:
            return {
                'opening_balance': opening_amount,
                'income_sum': income_sum,
                'expense_sum': expense_sum,
                'balance': balance
            }
        
        return balance


class PaymentCard(models.Model):
    name = models.CharField(max_length=100)
    number = models.CharField(max_length=32)
    holder_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        return f"{self.name} — {self.masked_number()}"

    def masked_number(self) -> str:
        if self.number and len(self.number) >= 4:
            return f"{self.number[:4]} **** {self.number[-4:]}"
        return self.number or ''

    def get_balance_usd(self) -> Decimal:
        """Kartadagi balans - faqat approved/confirmed to'lovlar va approved chiqimlar"""
        from decimal import Decimal
        from expenses.models import Expense
        
        income = self.payments.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).aggregate(
            total=models.Sum('amount_usd')
        )['total'] or Decimal('0.00')
        expense = self.expenses.filter(status=Expense.STATUS_APPROVED).aggregate(
            total=models.Sum('amount_usd')
        )['total'] or Decimal('0.00')
        return income - expense

    def get_balance_uzs(self) -> Decimal:
        """Kartadagi balans UZS"""
        from decimal import Decimal
        from expenses.models import Expense
        
        income = self.payments.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).aggregate(
            total=models.Sum('amount_uzs')
        )['total'] or Decimal('0.00')
        expense = self.expenses.filter(status=Expense.STATUS_APPROVED).aggregate(
            total=models.Sum('amount_uzs')
        )['total'] or Decimal('0.00')
        return income - expense



class CurrencyRate(models.Model):
    rate_date = models.DateField(unique=True)
    usd_to_uzs = models.DecimalField(max_digits=14, decimal_places=4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-rate_date',)

    def __str__(self) -> str:
        return f"{self.rate_date} -> {self.usd_to_uzs}"


class CashboxOpeningBalance(models.Model):
    """
    Opening balance for cashboxes.
    Latest record (by date, then created_at) is used as the opening balance.
    """
    cashbox = models.ForeignKey(
        Cashbox,
        on_delete=models.CASCADE,
        related_name='opening_balances',
        verbose_name="Kassa",
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name="Ochilish balansi",
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    date = models.DateField(
        verbose_name="Sana",
        help_text="Ochilish balansi sanasi"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Yaratuvchi"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Legacy fields for backward compatibility (will be removed after migration)
    cashbox_type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="Eski kassa turi"
    )
    balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Eski balans"
    )
    currency = models.CharField(
        max_length=3,
        null=True,
        blank=True,
        verbose_name="Eski valyuta"
    )

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Kassa ochilish balansi"
        verbose_name_plural = "Kassa ochilish balanslari"
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['cashbox']),
        ]

    def __str__(self) -> str:
        if self.cashbox:
            return f"{self.cashbox.name} - {self.amount} ({self.date})"
        return f"Eski: {self.cashbox_type} - {self.balance} {self.currency} ({self.date})"


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = 'cash', 'Cash'
        CARD = 'card', 'Card'
        TRANSFER = 'transfer', 'Bank Transfer'

    class Currency(models.TextChoices):
        USD = 'USD', 'USD'
        UZS = 'UZS', 'UZS'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'
        # Keep CONFIRMED for backward compatibility (will be migrated to APPROVED)
        CONFIRMED = 'confirmed', 'Tasdiqlangan (eski)'

    dealer = models.ForeignKey(
        'dealers.Dealer', on_delete=models.CASCADE, related_name='payments', null=True, blank=True
    )
    pay_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    
    # NOTE: USD va UZS summalar alohida saqlanadi - kurs o'zgarganda ham doimiy qoladi
    amount_usd = models.DecimalField(max_digits=14, decimal_places=2, editable=False, default=0)
    amount_uzs = models.DecimalField(max_digits=14, decimal_places=2, editable=False, default=0)
    
    rate = models.ForeignKey(CurrencyRate, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    method = models.CharField(max_length=20, choices=Method.choices)
    
    # Cashbox where this payment goes (NEW - replaces card in balance logic)
    cashbox = models.ForeignKey(
        Cashbox,
        on_delete=models.PROTECT,
        related_name='payments',
        null=True,
        blank=True,
        verbose_name="Kassa"
    )
    
    # Optional company card used for card payments (LEGACY - for backward compatibility)
    card = models.ForeignKey(
        'payments.PaymentCard', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments'
    )
    note = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Status"
    )
    
    # New approval workflow fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_payments',
        verbose_name="Created by"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_payments',
        verbose_name="Approved by"
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="Approved at")
    receipt_image = models.ImageField(
        upload_to='payments/receipts/',
        null=True,
        blank=True,
        verbose_name="Receipt image"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-pay_date', '-created_at')
        indexes = [
            models.Index(fields=['-pay_date']),
            models.Index(fields=['dealer']),
            models.Index(fields=['method']),
            models.Index(fields=['currency']),
            models.Index(fields=['card']),
        ]

    def __str__(self) -> str:
        return f"{self.dealer} - {self.amount} {self.currency}"

    def save(self, *args, **kwargs):
        # NOTE: Kurs hech qachon o'zgarmasligi uchun save() da qayd qilib qo'yamiz
        if not self.rate and self.currency == self.Currency.UZS:
            from payments.utils import rate_on
            self.rate = rate_on(self.pay_date)
        
        # NOTE: Valyutaga qarab amount_usd va amount_uzs ni to'ldirish
        if self.currency == self.Currency.USD:
            self.amount_usd = self.amount
            # USD -> UZS konvertatsiya
            rate_value = self.rate.usd_to_uzs if self.rate else Decimal('12500')
            self.amount_uzs = (self.amount * rate_value).quantize(Decimal('0.01'))
        else:
            self.amount_uzs = self.amount
            # UZS -> USD konvertatsiya
            rate_value = self.rate.usd_to_uzs if self.rate else Decimal('12500')
            self.amount_usd = (self.amount / rate_value).quantize(Decimal('0.01'))
        
        super().save(*args, **kwargs)
