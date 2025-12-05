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
        
        Note: This annotation only includes OrderReturn.
        ReturnItem from returns module is NOT included here for performance.
        For exact balance with all return types, use balance service per dealer.
        """
        from dealers.services.balance import annotate_dealers_with_balances
        return annotate_dealers_with_balances(self)


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
        Calculate dealer balance in USD using balance service.
        Includes both OrderReturn and ReturnItem.
        Balance = Opening Balance + Orders - All Returns - Payments
        Positive balance = dealer owes money (debt)
        """
        from dealers.services.balance import calculate_dealer_balance
        result = calculate_dealer_balance(self)
        return result['balance_usd']
    
    @property
    def balance_uzs(self) -> Decimal:
        """
        Calculate dealer balance in UZS using balance service.
        Includes both OrderReturn and ReturnItem.
        Each operation uses its own stored exchange rate.
        """
        from dealers.services.balance import calculate_dealer_balance
        result = calculate_dealer_balance(self)
        return result['balance_uzs']
    
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
