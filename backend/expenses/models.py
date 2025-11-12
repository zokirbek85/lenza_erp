from django.conf import settings
from django.db import models


class ExpenseType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return self.name


class Expense(models.Model):
    METHOD_CHOICES = [
        ('naqd', 'Naqd'),
        ('karta', 'Karta'),
    ]
    CURRENCY_CHOICES = [
        ('USD', 'USD'),
        ('UZS', 'UZS'),
    ]
    STATUS_CHOICES = [
        ('yaratilgan', 'Yaratilgan'),
        ('tasdiqlangan', 'Tasdiqlangan'),
    ]

    date = models.DateField(auto_now_add=True)
    type = models.ForeignKey(ExpenseType, on_delete=models.PROTECT, related_name='expenses')
    method = models.CharField(max_length=10, choices=METHOD_CHOICES)
    card = models.ForeignKey('payments.PaymentCard', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    comment = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_expenses')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_expenses')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='yaratilgan')
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('-date', '-created_at')

    def __str__(self) -> str:
        return f"{self.type.name} - {self.amount} {self.currency}"
