def format_currency(currency_rate) -> str:
    text = (
        "💱 <b>Valyuta kursi yangilandi!</b>\n"
        f"📅 Sana: {currency_rate.rate_date.strftime('%d.%m.%Y')}\n"
        f"🇺🇸 USD ➜ <b>{currency_rate.usd_to_uzs}</b> so‘m"
    )
    return text
