from decimal import Decimal

from django.db import models
from django.utils import timezone
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
        """Kartadagi balans - faqat confirmed to'lovlar va approved chiqimlar"""
        from decimal import Decimal
        from expenses.models import Expense
        
        income = self.payments.filter(status=Payment.Status.CONFIRMED).aggregate(
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
        
        income = self.payments.filter(status=Payment.Status.CONFIRMED).aggregate(
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
        CONFIRMED = 'confirmed', 'Tasdiqlangan'

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
    # Optional company card used for card payments
    card = models.ForeignKey(
        'payments.PaymentCard', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments'
    )
    note = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
        verbose_name="Status"
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
