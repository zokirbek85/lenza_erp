from django.core.management.base import BaseCommand

from telegram_bot.bot import start_bot


class Command(BaseCommand):
    help = 'Run Telegram bot for ERP notifications'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🤖 Telegram notification bot started...'))
        start_bot()
