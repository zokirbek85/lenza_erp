from decimal import Decimal, InvalidOperation

from django.db import transaction

from catalog.models import Product

from .models import Order, OrderItem, OrderReturn


def _normalize_quantity(value) -> Decimal:
    if isinstance(value, Decimal):
        quantity = value
    else:
        quantity = Decimal(str(value))
    return quantity.quantize(Decimal('0.01'))


def process_return(*, item: OrderItem, quantity, is_defect: bool, user=None) -> OrderReturn:
    try:
        qty = _normalize_quantity(quantity)
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError('Quantity must be a decimal number.') from exc

    if qty <= 0:
        raise ValueError('Quantity must be positive')
    if qty > item.qty:
        raise ValueError('Quantity exceeds ordered amount')

    with transaction.atomic():
        product = Product.objects.select_for_update().get(pk=item.product_id)
        if is_defect:
            product.stock_defect += qty
        else:
            product.stock_ok += qty
        product.save(update_fields=['stock_ok', 'stock_defect'])

        order_return = OrderReturn.objects.create(
            order=item.order,
            item=item,
            quantity=qty,
            is_defect=is_defect,
            processed_by=user,
        )

        item.status = OrderItem.ItemStatus.RETURNED
        item.save(update_fields=['status'])
        if qty == item.qty:
            item.order.status = Order.Status.RETURNED
            item.order.save(update_fields=['status'])
        item.order.recalculate_totals()

    return order_return
