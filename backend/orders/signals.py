from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from catalog.models import Product
from notifications.utils import push_global
from bot.services import broadcast_order_status

from .models import Order, OrderItem, OrderStatusLog


def _adjust_inventory(order: Order, multiplier: int):
    # Skip inventory adjustment for imported orders
    if order.is_imported:
        return
    
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

    # Skip inventory adjustment for imported orders
    if instance.is_imported:
        return

    if previous in Order.Status.active_statuses() and instance.status not in Order.Status.active_statuses():
        _adjust_inventory(instance, 1)
    elif (previous not in Order.Status.active_statuses()) and instance.status in Order.Status.active_statuses():
        _adjust_inventory(instance, -1)


@receiver(post_save, sender=OrderItem)
def recalc_totals_on_item_save(sender, instance: OrderItem, **kwargs):
    instance.order.recalculate_totals()


@receiver(pre_save, sender=OrderItem)
def set_price_from_history(sender, instance: OrderItem, **kwargs):
    """
    Automatically set price_at_time from ProductPrice history when creating new order item.
    This ensures immutable pricing based on order date.
    """
    # Only set price if not already set (new item or price not specified)
    if instance.price_at_time is None and instance.product_id:
        try:
            from catalog.models import ProductPrice
            
            # Get order date or use today
            if hasattr(instance, 'order') and instance.order and hasattr(instance.order, 'order_date'):
                date = instance.order.order_date.date()
            else:
                date = timezone.now().date()
            
            # Get price from history
            instance.price_at_time = ProductPrice.get_price_for_date(
                product=instance.product,
                date=date,
                currency=instance.currency
            )
        except ValueError:
            # If no price history found, use product's current sell_price_usd as fallback
            if hasattr(instance.product, 'sell_price_usd'):
                instance.price_at_time = instance.product.sell_price_usd
            else:
                instance.price_at_time = Decimal('0.00')
        except Exception as e:
            # Log error and set to zero to prevent save failure
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to set price from history: {e}")
            instance.price_at_time = Decimal('0.00')


@receiver(post_delete, sender=OrderItem)
def recalc_totals_on_item_delete(sender, instance: OrderItem, **kwargs):
    instance.order.recalculate_totals()
