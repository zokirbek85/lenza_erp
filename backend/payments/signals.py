from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.utils import push_global

from .models import CurrencyRate, Payment


@receiver(post_save, sender=Payment)
def announce_payment(sender, instance: Payment, created, **kwargs):
    event = 'payments.created' if created else 'payments.updated'
    payload = {
        'dealer': instance.dealer.name if instance.dealer else None,
        'amount': float(instance.amount),
        'currency': instance.currency,
        'pay_date': instance.pay_date.isoformat(),
    }
    if created:
        push_global('payment_added', payload)
    push_global(event, payload)


@receiver(post_save, sender=CurrencyRate)
def announce_rate(sender, instance: CurrencyRate, created, **kwargs):
    push_global(
        'currency.rate',
        {'rate_date': instance.rate_date.isoformat(), 'usd_to_uzs': float(instance.usd_to_uzs)},
    )
