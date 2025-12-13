"""
Signals for stock_defect module.
Automatically syncs product.stock_defect with ProductDefect records.
"""

from decimal import Decimal
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import ProductDefect, Product


@receiver(post_save, sender=ProductDefect)
def update_product_stock_defect_on_save(sender, instance, created, **kwargs):
    """
    Update product.stock_defect when ProductDefect is saved.
    
    product.stock_defect = sum(all ProductDefect.qty where status is active)
    Active statuses: detected, inspected, repairing
    Inactive statuses: repaired, disposed, sold_outlet
    """
    product = instance.product
    
    # Calculate total defect qty for this product
    # Only count defects that are still in defective state
    # Exclude: repaired (moved to stock_ok), disposed (removed), sold_outlet (sold)
    total_defect = ProductDefect.objects.filter(
        product=product,
        status__in=[
            ProductDefect.Status.DETECTED,
            ProductDefect.Status.INSPECTED,
            ProductDefect.Status.REPAIRING,
        ]
    ).aggregate(
        total=Sum('qty')
    )['total'] or Decimal('0.00')
    
    # Update product stock_defect
    Product.objects.filter(pk=product.pk).update(stock_defect=total_defect)


@receiver(post_delete, sender=ProductDefect)
def update_product_stock_defect_on_delete(sender, instance, **kwargs):
    """
    Update product.stock_defect when ProductDefect is deleted.
    """
    product = instance.product
    
    # Calculate total defect qty for this product
    # Only count defects that are still in defective state
    total_defect = ProductDefect.objects.filter(
        product=product,
        status__in=[
            ProductDefect.Status.DETECTED,
            ProductDefect.Status.INSPECTED,
            ProductDefect.Status.REPAIRING,
        ]
    ).aggregate(
        total=Sum('qty')
    )['total'] or Decimal('0.00')
    
    # Update product stock_defect
    Product.objects.filter(pk=product.pk).update(stock_defect=total_defect)