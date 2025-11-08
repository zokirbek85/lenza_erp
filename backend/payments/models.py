from decimal import Decimal

from django.db import models
from django.utils import timezone


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

    dealer = models.ForeignKey(
        'dealers.Dealer', on_delete=models.CASCADE, related_name='payments', null=True, blank=True
    )
    pay_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    amount_usd = models.DecimalField(max_digits=14, decimal_places=2, editable=False, default=0)
    rate = models.ForeignKey(CurrencyRate, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    method = models.CharField(max_length=20, choices=Method.choices)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-pay_date', '-created_at')

    def __str__(self) -> str:
        return f"{self.dealer} - {self.amount} {self.currency}"

    def save(self, *args, **kwargs):
        if not self.rate and self.currency == self.Currency.UZS:
            from payments.utils import rate_on

            self.rate = rate_on(self.pay_date)
        if self.currency == self.Currency.USD:
            self.amount_usd = self.amount
        else:
            rate_value = self.rate.usd_to_uzs if self.rate else Decimal('1')
            self.amount_usd = (self.amount / rate_value).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
