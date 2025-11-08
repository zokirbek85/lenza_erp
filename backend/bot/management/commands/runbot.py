from django.conf import settings
from django.core.management.base import BaseCommand
from telegram.ext import Application, CommandHandler

from bot.handlers import dealer_balance_command, start_command, stock_command, today_orders_command


class Command(BaseCommand):
    help = 'Run Telegram bot for Lenza ERP'

    def handle(self, *args, **options):
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        if not token:
            self.stderr.write('TELEGRAM_BOT_TOKEN is not configured.')
            return

        application = Application.builder().token(token).build()
        application.add_handler(CommandHandler('start', start_command))
        application.add_handler(CommandHandler('stock', stock_command))
        application.add_handler(CommandHandler('dealer_balance', dealer_balance_command))
        application.add_handler(CommandHandler('today_orders', today_orders_command))

        self.stdout.write(self.style.SUCCESS('Telegram bot is running. Press CTRL+C to stop.'))
        application.run_polling()
