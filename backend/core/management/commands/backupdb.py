from django.core.management.base import BaseCommand

from core.utils.backup import create_backup


class Command(BaseCommand):
    help = 'Create a PostgreSQL backup dump.'

    def handle(self, *args, **options):
        path = create_backup()
        self.stdout.write(self.style.SUCCESS(f'Backup created: {path}'))
