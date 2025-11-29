from decimal import Decimal, InvalidOperation

from django.utils import timezone


STATUS_EMOJIS = {
    'created': '🆕',
    'confirmed': '✅',
    'packed': '📦',
    'shipped': '🚚',
    'delivered': '📬',
    'cancelled': '❌',
    'returned': '↩️',
}

STATUS_UZ = {
    "CREATED": "Yaratildi",
    "CONFIRMED": "Tasdiqlandi",
    "PACKED": "Qadoqlandi",
    "SHIPPED": "Jo'natildi",
    "DELIVERED": "Yetkazildi",
    "CANCELLED": "Bekor qilindi",
    "RETURNED": "Qaytarildi",
}


def _format_quantity(value) -> str:
    try:
        return f"{Decimal(value):.2f}"
    except (InvalidOperation, TypeError, ValueError):
        return "0.00"


def _format_items(order, limit: int = 5) -> tuple[str, int]:
    queryset = order.items.select_related('product')
    items = list(queryset)
    total = len(items)
    if total == 0:
        return "• Hozircha mahsulot biriktirilmagan", 0

    rows = []
    for item in items[:limit]:
        product_name = item.product.name if item.product else 'Mahsulot'
        rows.append(f"• {product_name} × {_format_quantity(item.qty)}")

    if total > limit:
        rows.append(f"… va yana {total - limit} ta pozitsiya")

    return "\n".join(rows), total


def format_order(order, created: bool, previous_status: str | None = None) -> str:
    emoji = STATUS_EMOJIS.get(order.status, 'ℹ️')
    current_status_uz = STATUS_UZ.get(order.status.upper(), order.status.upper())
    if created:
        title = f"{emoji} <b>Yangi buyurtma #{order.display_no}</b>"
    else:
        from_status_uz = STATUS_UZ.get(previous_status.upper(), previous_status.upper()) if previous_status else '—'
        title = f"{emoji} Buyurtma #{order.display_no} holati {from_status_uz} ➜ <b>{current_status_uz}</b>"

    created_at = order.created_at or timezone.now()
    items_text, item_count = _format_items(order)

    text = (
        f"{title}\n"
        f"👤 Diler: {order.dealer.name}\n"
        f"📅 Sana: {created_at.strftime('%d.%m.%Y')}\n"
        f"📦 Pozitsiyalar: {item_count}\n"
        f"{items_text}\n"
        f"🔗 ERP: /orders/{order.id}\n"
    )
    return text
