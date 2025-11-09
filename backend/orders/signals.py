from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from catalog.models import Product
from notifications.utils import push_global
from bot.services import broadcast_order_status

from .models import Order, OrderItem, OrderStatusLog


def _adjust_inventory(order: Order, multiplier: int):
    with transaction.atomic():
        for item in order.items.select_related('product'):
            product = Product.objects.select_for_update().get(pk=item.product_id)
            delta = (item.qty or Decimal('0.00')) * multiplier
            new_stock = product.stock_ok + delta
            product.stock_ok = max(Decimal('0.00'), new_stock)
            product.save(update_fields=['stock_ok'])


@receiver(pre_save, sender=Order)
def cache_previous_status(sender, instance: Order, **kwargs):
    if not instance.pk:
        instance._previous_status = None
    else:
        instance._previous_status = sender.objects.filter(pk=instance.pk).values_list('status', flat=True).first()


@receiver(post_save, sender=Order)
def order_status_logging(sender, instance: Order, created, **kwargs):
    previous = getattr(instance, '_previous_status', None)
    if created or previous != instance.status:
        actor = getattr(instance, '_status_actor', instance.created_by)
        OrderStatusLog.objects.create(
            order=instance,
            old_status=previous,
            new_status=instance.status,
            by_user=actor,
        )
        push_global('orders.status', {'order': instance.display_no, 'status': instance.status})
        broadcast_order_status(instance)
        if hasattr(instance, '_status_actor'):
            delattr(instance, '_status_actor')

    if previous in Order.Status.active_statuses() and instance.status not in Order.Status.active_statuses():
        _adjust_inventory(instance, 1)
    elif (previous not in Order.Status.active_statuses()) and instance.status in Order.Status.active_statuses():
        _adjust_inventory(instance, -1)


@receiver(post_save, sender=OrderItem)
def recalc_totals_on_item_save(sender, instance: OrderItem, **kwargs):
    instance.order.recalculate_totals()


@receiver(post_delete, sender=OrderItem)
def recalc_totals_on_item_delete(sender, instance: OrderItem, **kwargs):
    instance.order.recalculate_totals()
