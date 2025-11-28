from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError

from notifications.utils import push_global

from .models import CurrencyRate, Payment, Expense, FinanceSource, FinanceLog


@receiver(post_save, sender=Payment)
def announce_payment(sender, instance: Payment, created, **kwargs):
    event = 'payments.created' if created else 'payments.updated'
    payload = {
        'dealer': instance.dealer.name if instance.dealer else None,
        'amount': float(instance.amount),
        'currency': instance.currency,
        'pay_date': instance.pay_date.isoformat(),
    }
    if created:
        push_global('payment_added', payload)
    push_global(event, payload)


@receiver(post_save, sender=CurrencyRate)
def announce_rate(sender, instance: CurrencyRate, created, **kwargs):
    push_global(
        'currency.rate',
        {'rate_date': instance.rate_date.isoformat(), 'usd_to_uzs': float(instance.usd_to_uzs)},
    )


# ============================================================================
# FINANCE SOURCE SIGNALS - Balance tracking and audit trail
# ============================================================================

@receiver(pre_save, sender=Payment)
def validate_payment_source_currency(sender, instance, **kwargs):
    """Validate currency match before saving payment"""
    if instance.source and instance.currency != instance.source.currency:
        raise ValidationError(
            f"To'lov valyutasi ({instance.currency}) moliya manbai valyutasiga ({instance.source.currency}) mos kelishi kerak"
        )


@receiver(post_save, sender=Payment)
def update_finance_source_on_payment(sender, instance, created, **kwargs):
    """
    Update FinanceSource balance when payment is approved.
    Create FinanceLog for audit trail.
    """
    # Skip if no source linked
    if not instance.source:
        # Reset tracked status after save
        instance._original_status = instance.status
        return
    
    # Only process approved/confirmed payments
    if instance.status not in [Payment.Status.APPROVED, Payment.Status.CONFIRMED]:
        # Reset tracked status after save
        instance._original_status = instance.status
        return
    
    # Check if this was just approved (status changed to approved)
    # Use _original_status tracked in model's __init__
    if not created:
        # Skip if status didn't change or was already approved (avoid double-counting)
        if hasattr(instance, '_original_status'):
            if instance._original_status in [Payment.Status.APPROVED, Payment.Status.CONFIRMED]:
                # Reset tracked status after save
                instance._original_status = instance.status
                return
        else:
            # Fallback: If _original_status not available, skip to be safe
            instance._original_status = instance.status
            return
    
    # Update source balance
    source = instance.source
    old_balance = source.balance
    source.balance += instance.amount
    source.save(update_fields=['balance', 'updated_at'])
    
    # Create audit log
    FinanceLog.objects.create(
        source=source,
        type=FinanceLog.TYPE_PAYMENT_IN,
        amount=instance.amount,
        old_balance=old_balance,
        new_balance=source.balance,
        reference_type='payment',
        reference_id=instance.pk,
        description=f"To'lov #{instance.pk} tasdiqlandi: {instance.dealer.name if instance.dealer else 'N/A'}",
        created_by=instance.approved_by or instance.created_by
    )
    
    # Reset tracked status after successful processing
    instance._original_status = instance.status


@receiver(pre_delete, sender=Payment)
def reverse_finance_source_on_payment_delete(sender, instance, **kwargs):
    """Reverse FinanceSource balance when approved payment is deleted."""
    # Skip if no source or payment wasn't approved
    if not instance.source:
        return
    
    if instance.status not in [Payment.Status.APPROVED, Payment.Status.CONFIRMED]:
        return
    
    # Reverse balance
    source = instance.source
    old_balance = source.balance
    source.balance -= instance.amount
    
    # Prevent negative balance
    if source.balance < 0:
        raise ValidationError(
            f"To'lovni o'chirib bo'lmaydi: moliya manbaida yetarli mablag' yo'q"
        )
    
    source.save(update_fields=['balance', 'updated_at'])
    
    # Create audit log
    FinanceLog.objects.create(
        source=source,
        type=FinanceLog.TYPE_ADJUSTMENT,
        amount=-instance.amount,
        old_balance=old_balance,
        new_balance=source.balance,
        reference_type='payment',
        reference_id=instance.pk,
        description=f"To'lov #{instance.pk} o'chirildi",
        created_by=None
    )


@receiver(pre_save, sender=Expense)
def validate_expense_balance(sender, instance, **kwargs):
    """
    Validate expense before saving:
    1. Currency must match source
    2. Balance must be sufficient when approving
    """
    # Currency validation
    if instance.source and instance.currency != instance.source.currency:
        raise ValidationError(
            f"Xarajat valyutasi ({instance.currency}) moliya manbai valyutasiga ({instance.source.currency}) mos kelishi kerak"
        )
    
    # Balance validation on approval
    if instance.status == Expense.STATUS_APPROVED:
        # Check if this is a new approval (not already approved)
        # Use _original_status tracked in model's __init__
        if instance.pk and hasattr(instance, '_original_status'):
            if instance._original_status == Expense.STATUS_APPROVED:
                # Already approved, skip validation
                return
        
        # Check balance
        if instance.source.balance < instance.amount:
            raise ValidationError(
                f"Moliya manbaida yetarli mablag' yo'q. "
                f"Mavjud: {instance.source.balance} {instance.source.currency}, "
                f"Kerak: {instance.amount} {instance.currency}"
            )


@receiver(post_save, sender=Expense)
def update_finance_source_on_expense(sender, instance, created, **kwargs):
    """
    Update FinanceSource balance when expense is approved.
    Create FinanceLog for audit trail.
    """
    # Only process approved expenses
    if instance.status != Expense.STATUS_APPROVED:
        # Reset tracked status after save
        instance._original_status = instance.status
        return
    
    # Check if this was just approved (status changed to approved)
    # Use _original_status tracked in model's __init__
    if not created:
        # Skip if status didn't change or was already approved (avoid double-deduction)
        if hasattr(instance, '_original_status'):
            if instance._original_status == Expense.STATUS_APPROVED:
                # Reset tracked status after save
                instance._original_status = instance.status
                return
        else:
            # Fallback: If _original_status not available, skip to be safe
            instance._original_status = instance.status
            return
    
    # Update source balance
    source = instance.source
    old_balance = source.balance
    source.balance -= instance.amount
    source.save(update_fields=['balance', 'updated_at'])
    
    # Create audit log
    FinanceLog.objects.create(
        source=source,
        type=FinanceLog.TYPE_EXPENSE_OUT,
        amount=instance.amount,
        old_balance=old_balance,
        new_balance=source.balance,
        reference_type='expense',
        reference_id=instance.pk,
        description=f"Xarajat #{instance.pk} tasdiqlandi: {instance.category.name}",
        created_by=instance.approved_by
    )
    
    # Reset tracked status after successful processing
    instance._original_status = instance.status


@receiver(pre_delete, sender=Expense)
def reverse_finance_source_on_expense_delete(sender, instance, **kwargs):
    """Reverse FinanceSource balance when approved expense is deleted."""
    # Skip if expense wasn't approved
    if instance.status != Expense.STATUS_APPROVED:
        return
    
    # Reverse balance (add back the expense amount)
    source = instance.source
    old_balance = source.balance
    source.balance += instance.amount
    source.save(update_fields=['balance', 'updated_at'])
    
    # Create audit log
    FinanceLog.objects.create(
        source=source,
        type=FinanceLog.TYPE_ADJUSTMENT,
        amount=instance.amount,
        old_balance=old_balance,
        new_balance=source.balance,
        reference_type='expense',
        reference_id=instance.pk,
        description=f"Xarajat #{instance.pk} o'chirildi",
        created_by=None
    )
