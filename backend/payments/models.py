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
    description = models.TextField(blank=True, verbose_name="Izoh", default="")
    
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
        balance = opening_balance + incomes
        (Note: Expenses module removed)
        
        Args:
            up_to_date: Calculate balance up to this date (inclusive)
            return_detailed: If True, return dict with breakdown, else return balance amount
        """
        from decimal import Decimal
        
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
        
        # No expenses - expenses module removed
        expense_sum = Decimal('0.00')
        
        balance = opening_amount + income_sum
        
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
        """Kartadagi balans - faqat approved/confirmed to'lovlar (expenses module removed)"""
        from decimal import Decimal
        
        income = self.payments.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).aggregate(
            total=models.Sum('amount_usd')
        )['total'] or Decimal('0.00')
        # Expenses module removed
        return income

    def get_balance_uzs(self) -> Decimal:
        """Kartadagi balans UZS (expenses module removed)"""
        from decimal import Decimal
        
        income = self.payments.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).aggregate(
            total=models.Sum('amount_uzs')
        )['total'] or Decimal('0.00')
        # Expenses module removed
        return income



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
    
    # NEW: Finance Source (unified money tracking)
    source = models.ForeignKey(
        'payments.FinanceSource',
        on_delete=models.PROTECT,
        related_name='payments',
        null=True,
        blank=True,
        verbose_name="Moliya manbai"
    )
    
    # Cashbox where this payment goes (LEGACY - being phased out in favor of source)
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


class FinanceSource(models.Model):
    """
    Finance Source - unified money source (cash, card, bank account).
    Tracks ALL money flow: incoming payments and outgoing expenses.
    """
    TYPE_CASH = 'cash'
    TYPE_CARD = 'card'
    TYPE_BANK = 'bank'
    
    TYPE_CHOICES = [
        (TYPE_CASH, 'Naqd pul'),
        (TYPE_CARD, 'Plastik karta'),
        (TYPE_BANK, 'Bank hisob raqami'),
    ]
    
    CURRENCY_USD = 'USD'
    CURRENCY_UZS = 'UZS'
    
    CURRENCY_CHOICES = [
        (CURRENCY_USD, 'USD'),
        (CURRENCY_UZS, 'UZS'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="Nomi")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Turi")
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, verbose_name="Valyuta")
    balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Balans"
    )
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    description = models.TextField(blank=True, verbose_name="Izoh")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")
    
    class Meta:
        ordering = ['type', 'currency', 'name']
        verbose_name = "Moliya manbai"
        verbose_name_plural = "Moliya manbalari"
        indexes = [
            models.Index(fields=['type', 'currency']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()}) - {self.currency}"
    
    def clean(self):
        """Validate business rules"""
        from django.core.exceptions import ValidationError
        
        if self.balance < 0:
            raise ValidationError("Balans manfiy bo'lishi mumkin emas")


class ExpenseCategory(models.Model):
    """Categories for expense tracking"""
    name = models.CharField(max_length=200, verbose_name="Nomi")
    description = models.TextField(blank=True, verbose_name="Izoh")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Xarajat turkumi"
        verbose_name_plural = "Xarajat turkumlari"
    
    def __str__(self):
        return self.name


class Expense(models.Model):
    """
    Expense tracking with approval workflow.
    Deducts from FinanceSource balance upon approval.
    """
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Kutilmoqda'),
        (STATUS_APPROVED, 'Tasdiqlangan'),
        (STATUS_REJECTED, 'Rad etilgan'),
    ]
    
    CURRENCY_USD = 'USD'
    CURRENCY_UZS = 'UZS'
    
    CURRENCY_CHOICES = [
        (CURRENCY_USD, 'USD'),
        (CURRENCY_UZS, 'UZS'),
    ]
    
    source = models.ForeignKey(
        FinanceSource,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Moliya manbai"
    )
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Turkum"
    )
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        verbose_name="Summa"
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        verbose_name="Valyuta"
    )
    description = models.TextField(blank=True, verbose_name="Izoh")
    expense_date = models.DateField(default=timezone.now, verbose_name="Xarajat sanasi")
    
    # Approval workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name="Holat"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_expenses',
        verbose_name="Yaratuvchi"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_expenses',
        verbose_name="Tasdiqlagan"
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="Tasdiqlangan vaqt")
    rejection_reason = models.TextField(blank=True, verbose_name="Rad etish sababi")
    
    receipt_image = models.ImageField(
        upload_to='expenses/receipts/',
        null=True,
        blank=True,
        verbose_name="Kvitansiya rasmi"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")
    
    class Meta:
        ordering = ['-expense_date', '-created_at']
        verbose_name = "Xarajat"
        verbose_name_plural = "Xarajatlar"
        indexes = [
            models.Index(fields=['-expense_date']),
            models.Index(fields=['source']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.category.name} - {self.amount} {self.currency} ({self.get_status_display()})"
    
    def clean(self):
        """Validate business rules"""
        from django.core.exceptions import ValidationError
        
        # Currency must match source currency
        if self.source and self.currency != self.source.currency:
            raise ValidationError({
                'currency': f"Valyuta moliya manbai valyutasiga mos kelishi kerak ({self.source.currency})"
            })
        
        # On approval, check balance
        if self.status == self.STATUS_APPROVED and self.source:
            if self.source.balance < self.amount:
                raise ValidationError({
                    'amount': f"Moliya manbaida yetarli mablag' yo'q. Mavjud: {self.source.balance} {self.source.currency}"
                })


class FinanceLog(models.Model):
    """
    Audit trail for all finance source balance changes.
    Auto-created via signals when payments are approved or expenses are processed.
    """
    TYPE_PAYMENT_IN = 'payment_in'
    TYPE_EXPENSE_OUT = 'expense_out'
    TYPE_ADJUSTMENT = 'adjustment'
    
    TYPE_CHOICES = [
        (TYPE_PAYMENT_IN, 'To\'lov kirimi'),
        (TYPE_EXPENSE_OUT, 'Xarajat chiqimi'),
        (TYPE_ADJUSTMENT, 'Tuzatish'),
    ]
    
    source = models.ForeignKey(
        FinanceSource,
        on_delete=models.CASCADE,
        related_name='logs',
        verbose_name="Moliya manbai"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Turi")
    amount = models.DecimalField(max_digits=18, decimal_places=2, verbose_name="Summa")
    old_balance = models.DecimalField(max_digits=18, decimal_places=2, verbose_name="Eski balans")
    new_balance = models.DecimalField(max_digits=18, decimal_places=2, verbose_name="Yangi balans")
    
    # Reference to source transaction
    reference_type = models.CharField(max_length=50, blank=True, verbose_name="Havola turi")  # 'payment' or 'expense'
    reference_id = models.IntegerField(null=True, blank=True, verbose_name="Havola ID")
    
    description = models.TextField(blank=True, verbose_name="Izoh")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Yaratuvchi"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Moliya jurnali"
        verbose_name_plural = "Moliya jurnallari"
        indexes = [
            models.Index(fields=['source', '-created_at']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]
    
    def __str__(self):
        return f"{self.source.name} - {self.get_type_display()} - {self.amount}"
