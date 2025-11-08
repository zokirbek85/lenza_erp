from datetime import date
from decimal import Decimal

from django.db.models import Max

from .models import CurrencyRate


def rate_on(rate_date: date) -> CurrencyRate | None:
    """Return the rate on a given date, or the latest available before it."""
    if not rate_date:
        rate_date = date.today()
    rate = CurrencyRate.objects.filter(rate_date=rate_date).first()
    if rate:
        return rate
    latest_date = (
        CurrencyRate.objects.filter(rate_date__lt=rate_date).aggregate(latest=Max('rate_date'))['latest']
    )
    if latest_date:
        return CurrencyRate.objects.filter(rate_date=latest_date).first()
    return CurrencyRate.objects.order_by('-rate_date').first()


def usd(value: float | Decimal | None) -> Decimal:
    from decimal import Decimal

    if value is None:
        return Decimal('0.00')
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))
