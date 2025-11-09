from telegram.ext import Application, CommandHandler
from django.conf import settings


async def start(update, context):
    await update.message.reply_text('✅ Bot guruhga muvaffaqiyatli ulandi!')


def start_bot() -> None:
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not token:
        raise RuntimeError('TELEGRAM_BOT_TOKEN is not configured. Please set TELEGRAM_BOT_TOKEN in environment.')

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler('start', start))
    app.run_polling()
