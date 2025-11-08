from typing import Iterable

from django.conf import settings
from django.contrib.auth import get_user_model

from telegram import Bot

User = get_user_model()
_bot_instance = None


def get_bot() -> Bot | None:
    global _bot_instance
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not token:
        return None
    if _bot_instance is None:
        _bot_instance = Bot(token=token)
    return _bot_instance


def _iter_chat_ids() -> Iterable[str]:
    return (
        user.telegram_id
        for user in User.objects.exclude(telegram_id__isnull=True).exclude(telegram_id='')
    )


def broadcast_order_status(order):
    bot = get_bot()
    if not bot:
        return
    message = f"Buyurtma {order.display_no} holati: {order.status.title()}"
    for chat_id in _iter_chat_ids():
        try:
            bot.send_message(chat_id=int(chat_id), text=message)
        except Exception:
            continue
