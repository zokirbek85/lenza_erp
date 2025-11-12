from django.db.models.signals import post_save
from django.dispatch import receiver
from payments.models import Payment
from expenses.models import Expense
from .services import LedgerService


@receiver(post_save, sender=Payment)
def on_payment_saved(sender, instance: Payment, created, **kwargs):
    if created:
        LedgerService.post_payment(instance)


@receiver(post_save, sender=Expense)
def on_expense_saved(sender, instance: Expense, created, **kwargs):
    # Only post to ledger when status is 'tasdiqlangan'
    if instance.status == 'tasdiqlangan':
        LedgerService.post_expense(instance)
