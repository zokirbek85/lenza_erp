def format_payment(payment) -> str:
    method = payment.get_method_display() if hasattr(payment, 'get_method_display') else payment.method
    text = (
        "💰 <b>Yangi to‘lov qabul qilindi!</b>\n"
        f"👤 Diler: {payment.dealer.name if payment.dealer else '—'}\n"
        f"💵 Miqdor: ${payment.amount_usd:.2f}\n"
        f"💳 Usul: {method}\n"
        f"📅 Sana: {payment.pay_date.strftime('%d.%m.%Y')}\n"
        f"🧾 Izoh: {payment.note or '—'}\n"
        f"🔗 ERP: /payments/{payment.id}"
    )
    return text
