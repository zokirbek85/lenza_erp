from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum, Q, F, Value, Case, When, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone


class Region(models.Model):
    name = models.CharField(
        max_length=120,
        unique=True,
        verbose_name="Region name",
        help_text="Unique name of the region"
    )
    manager_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='managed_regions',
        null=True,
        blank=True,
        verbose_name="Region manager",
        help_text="Sales manager assigned to this region"
    )

    class Meta:
        ordering = ('name',)
        verbose_name = "Region"
        verbose_name_plural = "Regions"

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
    name = models.CharField(
        max_length=255,
        verbose_name="Dealer name",
        help_text="Full name of the dealer/customer"
    )
    code = models.CharField(
        max_length=32,
        unique=True,
        verbose_name="Dealer code",
        help_text="Unique identifier code for the dealer"
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        related_name='dealers',
        verbose_name="Region",
        help_text="Geographic region where dealer is located"
    )
    contact = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Contact person",
        help_text="Name of contact person at dealer"
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name="Phone number",
        help_text="Contact phone number"
    )
    address = models.TextField(
        blank=True,
        default='',
        verbose_name="Address",
        help_text="Physical address of the dealer"
    )
    manager_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='managed_dealers',
        null=True,
        blank=True,
        verbose_name="Sales manager",
        help_text="Sales manager assigned to this dealer"
    )
    # New unified opening balance fields
    opening_balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
        verbose_name="Opening balance",
        help_text="Opening balance amount in opening_balance_currency"
    )
    opening_balance_currency = models.CharField(
        max_length=3,
        choices=[('USD', 'USD'), ('UZS', 'UZS')],
        default='USD',
        verbose_name="Opening balance currency",
        help_text="Currency of opening balance (USD or UZS)"
    )
    opening_balance_date = models.DateField(
        default=timezone.localdate,
        verbose_name="Opening balance date",
        help_text="Date when opening balance was set"
    )
    
    # Legacy fields - kept for backward compatibility, will be deprecated
    opening_balance_usd = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Opening balance (USD) - Legacy",
        help_text="Legacy field: Opening balance in USD"
    )
    opening_balance_uzs = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
        verbose_name="Opening balance (UZS) - Legacy",
        help_text="Legacy field: Opening balance in UZS"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active status",
        help_text="Whether this dealer is currently active"
    )
    include_in_manager_kpi = models.BooleanField(
        default=True,
        verbose_name="Include in manager KPI",
        help_text="Whether this dealer's sales and payments should be included in manager KPI calculation"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created at",
        help_text="Timestamp when dealer was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
        help_text="Timestamp of last update"
    )
    debt_usd = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Debt (USD) - Deprecated",
        help_text="Legacy field: Dealer debt in USD (deprecated, use balance service)"
    )

    objects = DealerQuerySet.as_manager()

    class Meta:
        ordering = ('name',)
        verbose_name = "Dealer"
        verbose_name_plural = "Dealers"

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
        Dealer's current balance in USD.
        Positive = dealer owes money (debt)
        Negative = dealer has overpaid (credit balance)
        """
        return self.balance_usd
    
    @property
    def current_debt_uzs(self) -> Decimal:
        """
        Dealer's current balance in UZS.
        Positive = dealer owes money (debt)
        Negative = dealer has overpaid (credit balance)
        """
        return self.balance_uzs
