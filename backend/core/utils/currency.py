"""
Currency exchange utilities
Provides centralized currency conversion logic using ExchangeRate model
"""
from decimal import Decimal
from datetime import date
from typing import Optional, Tuple

from django.utils import timezone


def get_exchange_rate(rate_date: Optional[date] = None) -> Tuple[Decimal, date]:
    """
    Get USD to UZS exchange rate for a specific date.
    
    Args:
        rate_date: Date for which to get the rate. If None, uses today.
    
    Returns:
        Tuple of (rate, rate_date): Exchange rate and the date it's from
        
    Raises:
        ValueError: If no exchange rate found and no fallback available
    """
    from finance.models import ExchangeRate
    
    if rate_date is None:
        rate_date = timezone.localdate()
    
    # Try to get rate for exact date or most recent rate before that date
    rate_obj = ExchangeRate.objects.filter(
        rate_date__lte=rate_date
    ).order_by('-rate_date').first()
    
    if rate_obj:
        return rate_obj.usd_to_uzs, rate_obj.rate_date
    
    # Fallback: get the earliest rate available (future rate)
    rate_obj = ExchangeRate.objects.order_by('rate_date').first()
    
    if rate_obj:
        return rate_obj.usd_to_uzs, rate_obj.rate_date
    
    # No rates in database - use fallback
    # This should only happen in development or before first rate is added
    fallback_rate = Decimal('12700')
    return fallback_rate, rate_date


def usd_to_uzs(amount_usd: Decimal, rate_date: Optional[date] = None) -> Tuple[Decimal, Decimal]:
    """
    Convert USD to UZS.
    
    Args:
        amount_usd: Amount in USD
        rate_date: Date for exchange rate. If None, uses today.
    
    Returns:
        Tuple of (amount_uzs, exchange_rate)
    """
    exchange_rate, _ = get_exchange_rate(rate_date)
    amount_uzs = (amount_usd * exchange_rate).quantize(Decimal('0.01'))
    return amount_uzs, exchange_rate


def uzs_to_usd(amount_uzs: Decimal, rate_date: Optional[date] = None) -> Tuple[Decimal, Decimal]:
    """
    Convert UZS to USD.
    
    Args:
        amount_uzs: Amount in UZS
        rate_date: Date for exchange rate. If None, uses today.
    
    Returns:
        Tuple of (amount_usd, exchange_rate)
    """
    exchange_rate, _ = get_exchange_rate(rate_date)
    
    if exchange_rate <= 0:
        raise ValueError(f"Invalid exchange rate: {exchange_rate}")
    
    amount_usd = (amount_uzs / exchange_rate).quantize(Decimal('0.01'))
    return amount_usd, exchange_rate


def convert_currency(
    amount: Decimal,
    from_currency: str,
    to_currency: str,
    rate_date: Optional[date] = None
) -> Tuple[Decimal, Optional[Decimal]]:
    """
    Convert amount between currencies.
    
    Args:
        amount: Amount to convert
        from_currency: Source currency ('USD' or 'UZS')
        to_currency: Target currency ('USD' or 'UZS')
        rate_date: Date for exchange rate
    
    Returns:
        Tuple of (converted_amount, exchange_rate_used)
        exchange_rate_used is None if no conversion needed
    """
    if from_currency == to_currency:
        return amount, None
    
    if from_currency == 'USD' and to_currency == 'UZS':
        return usd_to_uzs(amount, rate_date)
    
    if from_currency == 'UZS' and to_currency == 'USD':
        return uzs_to_usd(amount, rate_date)
    
    raise ValueError(f"Unsupported currency pair: {from_currency} -> {to_currency}")
