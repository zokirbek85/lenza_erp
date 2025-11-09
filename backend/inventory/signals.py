from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from catalog.models import Product

from .models import ReturnedProduct

try:
    from telegram_bot.services import send_telegram_message
except ImportError:  # pragma: no cover
    send_telegram_message = None


@receiver(post_save, sender=ReturnedProduct)
def update_stock_on_return(sender, instance: ReturnedProduct, created: bool, **kwargs):
    if not created or not instance.product_id:
        return
    product: Product = instance.product
    qty = instance.quantity or Decimal('0.00')
    if qty <= 0:
        return

    updated_fields: list[str] = []
    if instance.return_type == ReturnedProduct.ReturnType.DEFECTIVE:
        product.stock_defect = (product.stock_defect or Decimal('0.00')) + qty
        updated_fields.append('stock_defect')
    else:
        product.stock_ok = (product.stock_ok or Decimal('0.00')) + qty
        updated_fields.append('stock_ok')

    product.save(update_fields=updated_fields)

    if not send_telegram_message:
        return

    dealer_name = getattr(instance.dealer, 'name', 'Nomaʼlum diler')
    product_name = getattr(instance.product, 'name', 'Nomaʼlum mahsulot')
    reason = instance.reason or '—'
    return_type_label = "Sog'lom" if instance.return_type == ReturnedProduct.ReturnType.GOOD else 'Nuqsonli'
    text = (
        "↩️ <b>Mahsulot qaytarildi</b>\n"
        f"👤 Diler: {dealer_name}\n"
        f"📦 {product_name}\n"
        f"⚙️ Holati: {return_type_label}\n"
        f"🔢 Miqdor: {qty}\n"
        f"💬 Sabab: {reason}"
    )
    image_path = Path(settings.BASE_DIR) / 'telegram_bot' / 'assets' / 'return.png'
    try:
        send_telegram_message(text, str(image_path))
    except Exception:  # pragma: no cover
        pass
