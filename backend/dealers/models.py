from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum, Q, F, Value, Case, When, DecimalField
from django.db.models.functions import Coalesce


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


class DealerQuerySet(models.QuerySet):
    """Custom queryset for optimized balance calculations"""
    
    def with_balances(self):
        """
        Annotate dealers with calculated balances using a single query.
        Eliminates N+1 queries when fetching dealer lists.
        """
        from orders.models import Order, OrderReturn
        from finance.models import FinanceTransaction
        
        return self.annotate(
            # Orders total (active, not imported)
            total_orders_usd=Sum(
                'orders__total_usd',
                filter=Q(
                    orders__status__in=Order.Status.active_statuses(),
                    orders__is_imported=False
                ),
                default=Value(0)
            ),
            total_orders_uzs=Sum(
                'orders__total_uzs',
                filter=Q(
                    orders__status__in=Order.Status.active_statuses(),
                    orders__is_imported=False
                ),
                default=Value(0)
            ),
            # Returns total (from non-imported orders)
            # Note: Using reverse relation through Order's dealer field
            total_returns_usd=Coalesce(
                Sum(
                    Case(
                        When(orders__is_imported=False, then='orders__returns__amount_usd'),
                        default=Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)),
                        output_field=DecimalField(max_digits=18, decimal_places=2)
                    )
                ),
                Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)),
                output_field=DecimalField(max_digits=18, decimal_places=2)
            ),
            total_returns_uzs=Coalesce(
                Sum(
                    Case(
                        When(orders__is_imported=False, then='orders__returns__amount_uzs'),
                        default=Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)),
                        output_field=DecimalField(max_digits=18, decimal_places=2)
                    )
                ),
                Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)),
                output_field=DecimalField(max_digits=18, decimal_places=2)
            ),
            # Payments total (approved income only)
            total_payments_usd=Sum(
                'finance_transactions__amount_usd',
                filter=Q(
                    finance_transactions__type=FinanceTransaction.TransactionType.INCOME,
                    finance_transactions__status=FinanceTransaction.TransactionStatus.APPROVED
                ),
                default=Value(0)
            ),
            total_payments_uzs=Sum(
                'finance_transactions__amount_uzs',
                filter=Q(
                    finance_transactions__type=FinanceTransaction.TransactionType.INCOME,
                    finance_transactions__status=FinanceTransaction.TransactionStatus.APPROVED
                ),
                default=Value(0)
            ),
            # Calculated balances
            calculated_balance_usd=F('opening_balance_usd') + F('total_orders_usd') - F('total_returns_usd') - F('total_payments_usd'),
            calculated_balance_uzs=F('opening_balance_uzs') + F('total_orders_uzs') - F('total_returns_uzs') - F('total_payments_uzs'),
        )


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

    objects = DealerQuerySet.as_manager()

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
        """
        Calculate dealer balance in UZS.
        Each operation uses its own stored exchange rate.
        """
        from orders.models import Order, OrderReturn
        from finance.models import FinanceTransaction

        opening = self.opening_balance_uzs or Decimal('0')

        # Total of active orders in UZS (each order has its own rate)
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
        
        # Total of returns in UZS (each return has its own rate from order)
        returns_total = (
            OrderReturn.objects.filter(order__dealer=self, order__is_imported=False)
            .aggregate(total=Sum('amount_uzs'))
            .get('total')
            or Decimal('0')
        )
        
        # Total of approved income transactions in UZS (all currencies)
        # Each transaction has its own stored amount_uzs with original exchange rate
        payments_total = (
            FinanceTransaction.objects.filter(
                dealer=self,
                type=FinanceTransaction.TransactionType.INCOME,
                status=FinanceTransaction.TransactionStatus.APPROVED
            )
            .aggregate(total=Sum('amount_uzs'))
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
        Uses current exchange rate for conversion.
        """
        from core.utils.currency import usd_to_uzs
        
        debt_usd = self.current_debt_usd
        if debt_usd == 0:
            return Decimal('0')
        
        debt_uzs, _ = usd_to_uzs(debt_usd)
        return debt_uzs.quantize(Decimal('0.01'))
