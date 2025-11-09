from decimal import Decimal, InvalidOperation


def _format_quantity(value) -> str:
    try:
        return f"{Decimal(value):.2f}"
    except (InvalidOperation, TypeError, ValueError):
        return "0.00"


def format_return(order_return) -> str:
    product_name = "-"
    if order_return.item and order_return.item.product:
        product_name = order_return.item.product.name

    dealer_name = "-"
    if order_return.order and order_return.order.dealer:
        dealer_name = order_return.order.dealer.name

    defect_text = "Ha" if order_return.is_defect else "Yo'q"

    text = (
        "↩️ <b>Mahsulot qaytarildi!</b>\n"
        f"📦 Mahsulot: {product_name}\n"
        f"🔢 Miqdor: {_format_quantity(order_return.quantity)}\n"
        f"👤 Diler: {dealer_name}\n"
        f"💵 Summasi: ${order_return.amount_usd:.2f}\n"
        f"💬 Defekt: {defect_text}\n"
        f"🔗 ERP: /orders/{order_return.order_id}"
    )
    return text
