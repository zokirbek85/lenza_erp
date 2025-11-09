from telegram_bot.models import BotUser

BotUser.objects.update_or_create(
chat_id=84384898, 
defaults={"full_name": "Zokir Otajonov", "role": "admin", "is_active": True},
)
