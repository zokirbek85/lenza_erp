from django.core.management.base import BaseCommand
from ledger.models import LedgerAccount
from payments.models import PaymentCard


class Command(BaseCommand):
    help = "Create default ledger accounts (CASH, BANK) and link CARD accounts from PaymentCard"

    def handle(self, *args, **options):
        # Create or get CASH account
        cash, created = LedgerAccount.objects.get_or_create(
            type='cash',
            payment_card=None,
            defaults={
                'name': 'Kassa (Naqd)',
                'currency': 'USD',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created: {cash.name}"))
        else:
            self.stdout.write(f"Already exists: {cash.name}")

        # Create or get BANK account
        bank, created = LedgerAccount.objects.get_or_create(
            type='bank',
            payment_card=None,
            defaults={
                'name': 'Bank (Hisob)',
                'currency': 'USD',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created: {bank.name}"))
        else:
            self.stdout.write(f"Already exists: {bank.name}")

        # Create CARD accounts for all active PaymentCards
        for card in PaymentCard.objects.filter(is_active=True):
            acc, created = LedgerAccount.objects.get_or_create(
                type='card',
                payment_card=card,
                defaults={
                    'name': f"Karta — {card.name}",
                    'currency': 'USD',
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created: {acc.name}"))
            else:
                self.stdout.write(f"Already exists: {acc.name}")

        self.stdout.write(self.style.SUCCESS("✅ Ledger bootstrap completed"))
