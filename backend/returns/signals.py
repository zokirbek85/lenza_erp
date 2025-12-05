"""
Returns module signals for stock management.
Updates product stock when return items are created.
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.db.models.signals import post_save
from django.dispatch import receiver

from catalog.models import Product
from .models import ReturnItem


@receiver(post_save, sender=ReturnItem)
@transaction.atomic
def update_stock_on_return_item(sender, instance: ReturnItem, created: bool, **kwargs):
    """
    Update product stock when ReturnItem is created.
    - Healthy returns → stock_ok
    - Defect returns → stock_defect
    
    Uses select_for_update() and F() expressions for race-safe updates.
    """
    # Only process new items
    if not created:
        return
    
    # Skip if no product or invalid quantity
    if not instance.product_id or not instance.quantity or instance.quantity <= 0:
        return
    
    qty = instance.quantity
    
    # Lock product row to prevent race conditions
    product = Product.objects.select_for_update().get(pk=instance.product_id)
    
    # Route to appropriate stock field based on status
    if instance.status == ReturnItem.Status.DEFECT:
        # Defective product → stock_defect
        product.stock_defect = F('stock_defect') + qty
        product.save(update_fields=['stock_defect'])
    else:  # HEALTHY or any other status
        # Healthy product → stock_ok
        product.stock_ok = F('stock_ok') + qty
        product.save(update_fields=['stock_ok'])
    
    # Refresh to get actual values (F() expressions don't update in-memory object)
    product.refresh_from_db(fields=['stock_ok', 'stock_defect'])
