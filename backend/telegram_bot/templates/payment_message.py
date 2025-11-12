def format_payment(payment) -> str:
    method = payment.get_method_display() if hasattr(payment, 'get_method_display') else payment.method
    card_info = ''
    try:
        if getattr(payment, 'card', None):
            masked = payment.card.masked_number() if hasattr(payment.card, 'masked_number') else ''
            holder = payment.card.holder_name or ''
            parts = [p for p in [masked, f"({holder})" if holder else ''] if p]
            if parts:
                card_info = ' — ' + ' '.join(parts)
    except Exception:
        card_info = ''

    text = (
        "💰 <b>Yangi to‘lov qabul qilindi!</b>\n"
        f"👤 Diler: {payment.dealer.name if payment.dealer else '—'}\n"
        f"💵 Miqdor: ${payment.amount_usd:.2f}\n"
        f"💳 Usul: {method}{card_info}\n"
        f"📅 Sana: {payment.pay_date.strftime('%d.%m.%Y')}\n"
        f"🧾 Izoh: {payment.note or '—'}\n"
        f"🔗 ERP: /payments/{payment.id}"
    )
    return text
