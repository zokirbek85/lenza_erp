from django.conf import settings

BOT_TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
GROUP_CHAT_ID = getattr(settings, 'TELEGRAM_GROUP_CHAT_ID', None)
