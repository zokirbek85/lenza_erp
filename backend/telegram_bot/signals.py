from pathlib import Path

from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from orders.models import Order, OrderReturn
from payments.models import CurrencyRate, Payment

from .services import send_telegram_message
from .templates import currency_message, order_message, payment_message, return_message

ASSETS_DIR = Path(settings.BASE_DIR) / 'telegram_bot' / 'assets'

# Default image for order notifications
DEFAULT_IMAGE = 'https://lh3.googleusercontent.com/gg-dl/ABS2GSl9wagVxdrxD1pzIp9b8KwsDeXI4s0Grw6TASFRp_6O-MPEoH1uWInVMiIhVimMUWF1YqCMMleNpuz5n1bCt8NhVBmEJnZjJf7_kLC3yS9aggAwFtFXQeSUZe3G3YhOLN0CD9u5KxZVGvKXrpogYNv2L4c671Urb6XorSb321GtphKa=s1024-rj'

# Status-specific images
STATUS_IMAGES = {
    "CREATED": "https://ibb.co/FbmYnNYz",
    "CONFIRMED": "https://ibb.co/h1YzzmS4",
    "PACKED": "https://ibb.co/0VXbV7jg",
    "SHIPPED": "https://ibb.co/3yQMJvMG",
    "DELIVERED": "https://ibb.co/MxwB7Rts",
    "CANCELLED": "https://ibb.co/HT75zqLz",
    "RETURNED": "https://ibb.co/JYht9Fw",
}


def _asset_path(filename: str) -> str:
    path = ASSETS_DIR / filename
    return str(path) if path.exists() else ''


@receiver(pre_save, sender=Order)
def _cache_previous_status(sender, instance: Order, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        print(f'[Telegram Signal] New order being created (no previous status)')
        return
    try:
        previous = sender.objects.get(pk=instance.pk)
        instance._previous_status = previous.status
        print(f'[Telegram Signal] Cached previous status for order {instance.pk}: {previous.status}')
    except sender.DoesNotExist:
        instance._previous_status = None
        print(f'[Telegram Signal] Order {instance.pk} not found in DB (should not happen)')


@receiver(post_save, sender=Order)
def notify_order(sender, instance: Order, created: bool, **kwargs):
    status_changed = not created and getattr(instance, '_previous_status', None) != instance.status
    if not created and not status_changed:
        return
    
    print(f'[Telegram Signal] Order notification triggered:')
    print(f'  - Order ID: {instance.id}')
    print(f'  - Created: {created}')
    print(f'  - Status changed: {status_changed}')
    if status_changed:
        print(f'  - Previous status: {getattr(instance, "_previous_status", None)}')
        print(f'  - New status: {instance.status}')
    
    text = order_message.format_order(instance, created, getattr(instance, '_previous_status', None))
    # Use status-specific image or fallback to default
    image_url = STATUS_IMAGES.get(instance.status.upper(), DEFAULT_IMAGE)
    send_telegram_message(text, image_path=image_url)


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
