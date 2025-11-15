"""
Ledger Module - Professional Cashflow Tracking Models
Kassa balansi tizimi - zamonaviy arxitektura
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from decimal import Decimal


class LedgerRecord(models.Model):
    """
    Kassa operatsiyalari - soddalashtirilgan cashflow tracking
    Har bir yozuv kirim yoki chiqimni ifodalaydi
    """
    
    # Operatsiya turlari
    TYPE_INCOME = 'income'
    TYPE_EXPENSE = 'expense'
    TYPE_CHOICES = [
        (TYPE_INCOME, 'Kirim'),
        (TYPE_EXPENSE, 'Chiqim'),
    ]
    
    # Operatsiya manbalari
    SOURCE_PAYMENT = 'payment'          # To'lovlardan
    SOURCE_EXPENSE = 'expense'          # Chiqimlardan
    SOURCE_ADJUSTMENT = 'adjustment'    # Qo'lda tuzatish
    SOURCE_RETURN = 'return'            # Qaytarilgan mahsulotlar
    SOURCE_CHOICES = [
        (SOURCE_PAYMENT, 'To\'lov'),
        (SOURCE_EXPENSE, 'Chiqim'),
        (SOURCE_ADJUSTMENT, 'Tuzatish'),
        (SOURCE_RETURN, 'Qaytarish'),
    ]
    
    # Valyutalar
    CURRENCY_USD = 'USD'
    CURRENCY_UZS = 'UZS'
    CURRENCY_CHOICES = [
        (CURRENCY_USD, 'USD'),
        (CURRENCY_UZS, 'UZS'),
    ]
    
    # Asosiy maydonlar
    date = models.DateField(default=timezone.now, verbose_name="Sana")
    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        verbose_name="Turi"
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        verbose_name="Manba"
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
    
    # NOTE: USD va UZS summalar alohida saqlanadi - Payment/Expense'dan nusxa olinadi
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
    
    description = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Tavsif"
    )
    
    # Reference fields (boshqa modellarga havola)
    ref_model = models.CharField(max_length=50, blank=True, verbose_name="Model")
    ref_id = models.IntegerField(null=True, blank=True, verbose_name="ID")
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ledger_records',
        verbose_name="Yaratuvchi"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")

    class Meta:
        db_table = 'ledger_records'
        ordering = ['-date', '-created_at']
        verbose_name = 'Kassa operatsiyasi'
        verbose_name_plural = 'Kassa operatsiyalari'
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['type', 'date']),
            models.Index(fields=['source']),
            models.Index(fields=['ref_model', 'ref_id']),
        ]

    def __str__(self):
        type_symbol = '+' if self.type == self.TYPE_INCOME else '-'
        return f"{type_symbol}{self.amount} {self.currency} - {self.get_source_display()} ({self.date})"
    
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
    
    @classmethod
    def get_balance(cls, date_to=None, currency=None):
        """
        Balansni hisoblash
        Kirimlar - Chiqimlar = Balans
        """
        qs = cls.objects.all()
        
        if date_to:
            qs = qs.filter(date__lte=date_to)
        
        if currency:
            qs = qs.filter(currency=currency)
        
        # Kirimlar
        income = qs.filter(type=cls.TYPE_INCOME).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Chiqimlar
        expense = qs.filter(type=cls.TYPE_EXPENSE).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        return income - expense
    
    @classmethod
    def create_from_payment(cls, payment):
        """
        Payment obyektidan ledger record yaratish
        NOTE: amount_usd va amount_uzs Payment'dan nusxa olinadi
        """
        return cls.objects.create(
            date=payment.pay_date,
            type=cls.TYPE_INCOME,
            source=cls.SOURCE_PAYMENT,
            currency=payment.currency,
            amount=payment.amount,
            amount_usd=payment.amount_usd,
            amount_uzs=payment.amount_uzs,
            description=f"To'lov #{payment.id} - {payment.dealer.name}",
            ref_model='payment',
            ref_id=payment.id,
            created_by=payment.created_by
        )
    
    @classmethod
    def create_from_expense(cls, expense):
        """
        Expense obyektidan ledger record yaratish
        NOTE: amount_usd va amount_uzs Expense'dan nusxa olinadi
        """
        return cls.objects.create(
            date=expense.date,
            type=cls.TYPE_EXPENSE,
            source=cls.SOURCE_EXPENSE,
            currency=expense.currency,
            amount=expense.amount,
            amount_usd=expense.amount_usd,
            amount_uzs=expense.amount_uzs,
            description=f"Chiqim #{expense.id} - {expense.type.name}",
            ref_model='expense',
            ref_id=expense.id,
            created_by=expense.created_by
        )
