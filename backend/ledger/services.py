from decimal import Decimal
from django.db import transaction
from .models import LedgerAccount, LedgerEntry


class LedgerService:
    @staticmethod
    @transaction.atomic
    def post_payment(payment, actor=None):
        """
        Post payment as income to appropriate ledger account.
        - method=naqd -> CASH account
        - method=karta -> CARD account (by Payment.card)
        - method=bank -> BANK account
        """
        # Check if already posted (idempotency)
        if LedgerEntry.objects.filter(ref_app='payments', ref_id=str(payment.id)).exists():
            return

        if payment.method == 'naqd':
            try:
                account = LedgerAccount.objects.get(type='cash', is_active=True)
            except LedgerAccount.DoesNotExist:
                return
        elif payment.method == 'karta' and payment.card_id:
            try:
                account = LedgerAccount.objects.get(type='card', payment_card_id=payment.card_id, is_active=True)
            except LedgerAccount.DoesNotExist:
                return
        elif payment.method == 'bank':
            try:
                account = LedgerAccount.objects.get(type='bank', is_active=True)
            except LedgerAccount.DoesNotExist:
                return
        else:
            return

        pay_date = payment.pay_date if payment.pay_date else payment.created_at.date()
        usd = LedgerEntry.to_usd(payment.amount, payment.currency, pay_date)
        LedgerEntry.objects.create(
            account=account,
            kind='payment_in',
            ref_app='payments',
            ref_id=str(payment.id),
            date=pay_date,
            currency=payment.currency,
            amount=payment.amount,
            amount_usd=usd,
            note=f"Kirim (Payment #{payment.id})",
            created_by=getattr(payment, 'created_by', actor)
        )

    @staticmethod
    @transaction.atomic
    def post_expense(expense, actor=None):
        """
        Post expense as outflow from appropriate ledger account.
        - method=naqd -> CASH account
        - method=karta -> CARD account (by Expense.card)
        """
        # Check if already posted (idempotency)
        if LedgerEntry.objects.filter(ref_app='expenses', ref_id=str(expense.id)).exists():
            return

        if expense.method == 'naqd':
            try:
                account = LedgerAccount.objects.get(type='cash', is_active=True)
            except LedgerAccount.DoesNotExist:
                return
        elif expense.method == 'karta' and expense.card_id:
            try:
                account = LedgerAccount.objects.get(type='card', payment_card_id=expense.card_id, is_active=True)
            except LedgerAccount.DoesNotExist:
                return
        else:
            return

        usd = LedgerEntry.to_usd(expense.amount, expense.currency, expense.date)
        LedgerEntry.objects.create(
            account=account,
            kind='expense_out',
            ref_app='expenses',
            ref_id=str(expense.id),
            date=expense.date,
            currency=expense.currency,
            amount=Decimal('-1') * expense.amount,
            amount_usd=Decimal('-1') * usd,
            note=f"Chiqim (Expense #{expense.id}) — {expense.type.name}",
            created_by=getattr(expense, 'created_by', actor)
        )

    @staticmethod
    @transaction.atomic
    def post_adjustment(account: LedgerAccount, amount: Decimal, currency: str, note: str, actor=None, date=None):
        """Manual adjustment entry (+/- amount) for opening balance or corrections."""
        from django.utils import timezone
        on = date or timezone.now().date()
        usd = LedgerEntry.to_usd(amount, currency, on)
        return LedgerEntry.objects.create(
            account=account,
            kind='adjustment',
            ref_app='',
            ref_id='',
            date=on,
            currency=currency,
            amount=amount,
            amount_usd=usd,
            note=note,
            created_by=actor
        )
