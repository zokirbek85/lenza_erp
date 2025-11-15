"""
Expenses Module - Professional Models
Chiqimlar tizimi - zamonaviy arxitektura
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from decimal import Decimal


class ExpenseType(models.Model):
    """Chiqim turlari (Transport, Ofis, Ish haqi, va h.k.)"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nomi")
    description = models.TextField(blank=True, null=True, verbose_name="Tavsif")
    is_active = models.BooleanField(default=True, verbose_name="Faolmi")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expense_types'
        ordering = ['name']
        verbose_name = 'Chiqim turi'
        verbose_name_plural = 'Chiqim turlari'

    def __str__(self):
        return self.name


class Expense(models.Model):
    """Asosiy chiqim modeli - to'liq funksional"""
    
    # To'lov usullari
    METHOD_CASH = 'cash'
    METHOD_CARD = 'card'
    METHOD_CHOICES = [
        (METHOD_CASH, 'Naqd'),
        (METHOD_CARD, 'Karta'),
    ]
    
    # Valyutalar
    CURRENCY_USD = 'USD'
    CURRENCY_UZS = 'UZS'
    CURRENCY_CHOICES = [
        (CURRENCY_USD, 'USD'),
        (CURRENCY_UZS, 'UZS'),
    ]
    
    # Statuslar
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Kutilmoqda'),
        (STATUS_APPROVED, 'Tasdiqlangan'),
    ]

    # Asosiy maydonlar
    date = models.DateField(default=timezone.now, verbose_name="Sana")
    type = models.ForeignKey(
        ExpenseType,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Turi"
    )
    method = models.CharField(
        max_length=10,
        choices=METHOD_CHOICES,
        default=METHOD_CASH,
        verbose_name="To'lov usuli"
    )
    card = models.ForeignKey(
        'payments.PaymentCard',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name="Karta"
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default=CURRENCY_USD,
        verbose_name="Valyuta"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Summa"
    )
    
    # NOTE: USD va UZS summalar alohida saqlanadi - kurs o'zgarganda ham doimiy qoladi
    amount_usd = models.DecimalField(
        max_digits=14, 
        decimal_places=2, 
        editable=False, 
        default=0,
        verbose_name="Summa USD"
    )
    amount_uzs = models.DecimalField(
        max_digits=14, 
        decimal_places=2, 
        editable=False, 
        default=0,
        verbose_name="Summa UZS"
    )
    
    description = models.TextField(blank=True, verbose_name="Tavsif")
    
    # Status va tasdiqlash
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name="Status"
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
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="Tasdiqlangan vaqt")

    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']
        verbose_name = 'Chiqim'
        verbose_name_plural = 'Chiqimlar'
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['status']),
            models.Index(fields=['type', 'date']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.type.name} - {self.amount} {self.currency} ({self.get_status_display()})"
    
    def clean(self):
        """Validatsiya: Karta tanlansa method='card' bo'lishi kerak"""
        from django.core.exceptions import ValidationError
        if self.card and self.method != self.METHOD_CARD:
            raise ValidationError("Karta tanlangan bo'lsa, to'lov usuli 'Karta' bo'lishi kerak")
        if self.method == self.METHOD_CARD and not self.card:
            raise ValidationError("To'lov usuli 'Karta' bo'lsa, karta tanlanishi kerak")
    
    def save(self, *args, **kwargs):
        """
        NOTE: Saqlanishdan oldin:
        1. Validatsiya (full_clean)
        2. Agar kurs yo'q bo'lsa - bugungi kursni olamiz yoki yaratamiz
        3. currency=USD bo'lsa: amount_usd = amount, amount_uzs = amount * kurs
        4. currency=UZS bo'lsa: amount_uzs = amount, amount_usd = amount / kurs
        5. Ikkala summa ham saqlanadi va hech qachon o'zgarmaydi (kurs doimiy)
        """
        from payments.models import CurrencyRate
        
        self.full_clean()
        
        # Kursni olish yoki yaratish
        rate_instance, created = CurrencyRate.objects.get_or_create(
            rate_date=self.date,
            defaults={'usd_to_uzs': Decimal('12600.00')}
        )
        
        rate = rate_instance.usd_to_uzs
        
        # Valyutaga qarab USD va UZS summalarni hisoblash
        if self.currency == self.CURRENCY_USD:
            self.amount_usd = self.amount
            self.amount_uzs = (self.amount * rate).quantize(Decimal('0.01'))
        else:  # UZS
            self.amount_uzs = self.amount
            self.amount_usd = (self.amount / rate).quantize(Decimal('0.01'))
        
        super().save(*args, **kwargs)
    
    @property
    def amount_in_usd(self):
        """USD'ga konvertatsiya qilish"""
        if self.currency == self.CURRENCY_USD:
            return self.amount
        
        # UZS -> USD
        from payments.models import CurrencyRate
        rate = CurrencyRate.objects.filter(
            rate_date__lte=self.date
        ).order_by('-rate_date').first()
        
        if rate:
            return (self.amount / Decimal(str(rate.usd_to_uzs))).quantize(Decimal('0.01'))
        
        # Fallback rate
        return (self.amount / Decimal('12500')).quantize(Decimal('0.01'))
