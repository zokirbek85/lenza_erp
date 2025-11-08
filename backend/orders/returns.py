from django.db import transaction

from catalog.models import Product

from .models import Order, OrderItem, OrderReturn


def process_return(*, item: OrderItem, quantity: int, is_defect: bool, user=None) -> OrderReturn:
    if quantity <= 0:
        raise ValueError('Quantity must be positive')
    if quantity > item.qty:
        raise ValueError('Quantity exceeds ordered amount')

    with transaction.atomic():
        product = Product.objects.select_for_update().get(pk=item.product_id)
        if is_defect:
            product.stock_defect += quantity
        else:
            product.stock_ok += quantity
        product.save(update_fields=['stock_ok', 'stock_defect'])

        order_return = OrderReturn.objects.create(
            order=item.order,
            item=item,
            quantity=quantity,
            is_defect=is_defect,
            processed_by=user,
        )

        item.status = OrderItem.ItemStatus.RETURNED
        item.save(update_fields=['status'])
        if quantity == item.qty:
            item.order.status = Order.Status.RETURNED
            item.order.save(update_fields=['status'])
        item.order.recalculate_totals()

    return order_return
