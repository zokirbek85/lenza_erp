from pathlib import Path

from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from orders.models import Order, OrderReturn
from payments.models import CurrencyRate, Payment

from .services import send_telegram_message
from .templates import currency_message, order_message, payment_message, return_message

ASSETS_DIR = Path(settings.BASE_DIR) / 'telegram_bot' / 'assets'


def _asset_path(filename: str) -> str:
    path = ASSETS_DIR / filename
    return str(path) if path.exists() else ''


@receiver(pre_save, sender=Order)
def _cache_previous_status(sender, instance: Order, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return
    try:
        previous = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        instance._previous_status = None
    else:
        instance._previous_status = previous.status


@receiver(post_save, sender=Order)
def notify_order(sender, instance: Order, created: bool, **kwargs):
    status_changed = not created and getattr(instance, '_previous_status', None) != instance.status
    if not created and not status_changed:
        return
    text = order_message.format_order(instance, created, getattr(instance, '_previous_status', None))
    send_telegram_message(text, image_path=_asset_path('order.png'))


@receiver(post_save, sender=Payment)
def notify_payment(sender, instance: Payment, created: bool, **kwargs):
    if not created:
        return
    text = payment_message.format_payment(instance)
    send_telegram_message(text, image_path=_asset_path('payment.png'))


@receiver(post_save, sender=CurrencyRate)
def notify_currency(sender, instance: CurrencyRate, created: bool, **kwargs):
    if not created:
        return
    text = currency_message.format_currency(instance)
    send_telegram_message(text, image_path=_asset_path('currency.png'))


@receiver(post_save, sender=OrderReturn)
def notify_return(sender, instance: OrderReturn, created: bool, **kwargs):
    if not created:
        return
    text = return_message.format_return(instance)
    send_telegram_message(text, image_path=_asset_path('return.png'))
