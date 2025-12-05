from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum


class Region(models.Model):
    name = models.CharField(max_length=120, unique=True)
    manager_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='managed_regions',
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return self.name


class Dealer(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=32, unique=True)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, related_name='dealers')
    contact = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True, default='')
    address = models.TextField(blank=True, default='')
    manager_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='managed_dealers',
        null=True,
        blank=True,
    )
    opening_balance_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    opening_balance_uzs = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    debt_usd = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        ordering = ('name',)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    @property
    def balance_usd(self) -> Decimal:
        """
        Calculate dealer balance in USD.
        Balance = Opening Balance + Orders Total - Returns Total - Payments Total
        Positive balance = dealer owes money (debt)
        """
        from orders.models import Order, OrderReturn
        from finance.models import FinanceTransaction

        opening = self.opening_balance_usd or Decimal('0')

        # Total of active orders
        orders_total = (
            Order.objects.filter(
                dealer=self, 
                status__in=Order.Status.active_statuses(),
                is_imported=False
            )
            .aggregate(total=Sum('total_usd'))
            .get('total')
            or Decimal('0')
        )
        
        # Total of returns
        returns_total = (
            OrderReturn.objects.filter(order__dealer=self, order__is_imported=False)
            .aggregate(total=Sum('amount_usd'))
            .get('total')
            or Decimal('0')
        )
        
        # Total of approved income transactions (payments from dealer)
        payments_total = (
            FinanceTransaction.objects.filter(
                dealer=self,
                type=FinanceTransaction.TransactionType.INCOME,
                status=FinanceTransaction.TransactionStatus.APPROVED
            )
            .aggregate(total=Sum('amount_usd'))
            .get('total')
            or Decimal('0')
        )

        return opening + orders_total - returns_total - payments_total
    
    @property
    def balance_uzs(self) -> Decimal:
        """Calculate dealer balance in UZS using same formula as USD."""
        from orders.models import Order, OrderReturn
        from finance.models import FinanceTransaction

        opening = self.opening_balance_uzs or Decimal('0')

        # Total of active orders in UZS
        orders_total = (
            Order.objects.filter(
                dealer=self, 
                status__in=Order.Status.active_statuses(),
                is_imported=False
            )
            .aggregate(total=Sum('total_uzs'))
            .get('total')
            or Decimal('0')
        )
        
        # Total of returns in UZS
        returns_total = (
            OrderReturn.objects.filter(order__dealer=self, order__is_imported=False)
            .aggregate(total=Sum('amount_uzs'))
            .get('total')
            or Decimal('0')
        )
        
        # Total of approved income transactions in UZS
        payments_total = (
            FinanceTransaction.objects.filter(
                dealer=self,
                type=FinanceTransaction.TransactionType.INCOME,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                currency='UZS'
            )
            .aggregate(total=Sum('amount'))
            .get('total')
            or Decimal('0')
        )

        return opening + orders_total - returns_total - payments_total
    
    @property
    def current_balance_usd(self) -> Decimal:
        """Alias for balance_usd for API compatibility."""
        return self.balance_usd
    
    @property
    def current_balance_uzs(self) -> Decimal:
        """Alias for balance_uzs for API compatibility."""
        return self.balance_uzs
    
    @property
    def current_debt_usd(self) -> Decimal:
        """
        Dealer's current debt in USD (only positive balances).
        Returns 0 if balance is negative or zero.
        """
        balance = self.balance_usd
        return balance if balance > 0 else Decimal('0')
    
    @property
    def current_debt_uzs(self) -> Decimal:
        """
        Dealer's current debt in UZS.
        Uses hardcoded exchange rate (1 USD = 12600 UZS) for conversion.
        Note: Dynamic exchange rate model not available in system.
        """
        debt_usd = self.current_debt_usd
        if debt_usd == 0:
            return Decimal('0')
        
        # Hardcoded exchange rate matching orders.models.Order
        USD_TO_UZS_RATE = Decimal('12600')
        return (debt_usd * USD_TO_UZS_RATE).quantize(Decimal('0.01'))
