from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _

from orders.models import Order
from .models import FinanceAccount, FinanceTransaction


@receiver(post_save, sender=Order)
def create_transaction_on_order_approved(sender, instance, created, **kwargs):
    """
    Order confirmed bo'lganda avtomatik income transaction yaratish.
    Faqat confirmed orderlar uchun (created -> confirmed o'tganda).
    """
    # Skip if order is not confirmed or is imported
    if instance.status != Order.Status.CONFIRMED or instance.is_imported:
        return
    
    # Check if transaction already exists for this order
    if FinanceTransaction.objects.filter(
        dealer=instance.dealer,
        comment__contains=f"Order #{instance.id}"
    ).exists():
        return
    
    # Get or create default cash account for order currency
    try:
        account = FinanceAccount.objects.get(
            type=FinanceAccount.AccountType.CASH,
            currency=instance.currency,
            is_active=True
        )
    except FinanceAccount.DoesNotExist:
        # No active cash account found, skip transaction creation
        return
    except FinanceAccount.MultipleObjectsReturned:
        # Multiple accounts found, use the first one
        account = FinanceAccount.objects.filter(
            type=FinanceAccount.AccountType.CASH,
            currency=instance.currency,
            is_active=True
        ).first()
    
    # Create draft transaction (admin will approve it)
    FinanceTransaction.objects.create(
        type=FinanceTransaction.TransactionType.INCOME,
        dealer=instance.dealer,
        account=account,
        date=instance.created_at.date(),
        currency=instance.currency,
        amount=instance.total,
        category='Order Income',
        comment=f"Order #{instance.id} - {instance.dealer.name}",
        status=FinanceTransaction.TransactionStatus.DRAFT,
        created_by=instance.created_by
    )
