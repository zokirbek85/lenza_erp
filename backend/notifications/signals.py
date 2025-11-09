from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import SystemNotification
from notifications.utils import push_global
from orders.models import Order, OrderReturn
from payments.models import Payment


def _create_notification(
    title: str, 
    message: str, 
    level: str = 'info', 
    notification_type: str = 'general',
    link: str = None
) -> SystemNotification:
    """Create notification and broadcast to WebSocket + Telegram"""
    notification = SystemNotification.objects.create(title=title, message=message, level=level)
    push_global('notification', {
        'id': notification.id,
        'title': title, 
        'message': message, 
        'level': level,
        'type': notification_type,
        'link': link,
        'created_at': notification.created_at.isoformat()
    })
    return notification


@receiver(post_save, sender=Order)
def notify_order_created(sender, instance: Order, created, **kwargs):
    if created:
        _create_notification(
            'Yangi buyurtma', 
            f'{instance.display_no} uchun buyurtma yaratildi.',
            notification_type='order',
            link=f'/orders'
        )


@receiver(post_save, sender=Payment)
def notify_payment(sender, instance: Payment, created, **kwargs):
    if created:
        dealer_name = instance.dealer.name if instance.dealer else 'Noma\'lum diler'
        _create_notification(
            'To\'lov qabul qilindi', 
            f"{dealer_name} dan {instance.amount} {instance.currency} tushdi.",
            notification_type='payment',
            link='/payments'
        )


@receiver(post_save, sender=OrderReturn)
def notify_return(sender, instance: OrderReturn, created, **kwargs):
    if created:
        _create_notification(
            'Qaytarish', 
            f"{instance.order.display_no} buyurtmasi uchun qaytarish qayd etildi.", 
            level='warning',
            notification_type='return',
            link='/returns'
        )
