"""
Test script to debug currency transfer endpoint issue
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from decimal import Decimal
from django.utils import timezone
from finance.models import FinanceAccount, FinanceTransaction
from finance.serializers import CurrencyTransferSerializer

# Test data
test_data = {
    'from_account_id': 1,  # Replace with actual USD account ID
    'to_account_id': 2,    # Replace with actual UZS account ID
    'usd_amount': '100.00',
    'rate': '12700.0000',
    'date': '2025-12-11',
    'comment': 'Test transfer'
}

print("Testing CurrencyTransferSerializer...")
print(f"Test data: {test_data}")

# Test serializer validation
serializer = CurrencyTransferSerializer(data=test_data)
try:
    if serializer.is_valid(raise_exception=True):
        print("\n✓ Serializer validation passed")
        print(f"Validated data: {serializer.validated_data}")
        
        # Try to create transactions like the view does
        from_account = serializer.validated_data['from_account']
        to_account = serializer.validated_data['to_account']
        usd_amount = serializer.validated_data['usd_amount']
        rate = serializer.validated_data['rate']
        trans_date = serializer.validated_data['date']
        comment = serializer.validated_data.get('comment', '')
        
        print(f"\nFrom account: {from_account.name} ({from_account.currency})")
        print(f"To account: {to_account.name} ({to_account.currency})")
        print(f"USD amount: {usd_amount}")
        print(f"Rate: {rate}")
        print(f"UZS amount: {usd_amount * rate}")
        
        # Try to create the first transaction
        print("\nAttempting to create USD transaction...")
        uzs_amount = usd_amount * rate
        
        try:
            usd_transaction = FinanceTransaction(
                type=FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_OUT,
                account=from_account,
                related_account=to_account,
                date=trans_date,
                currency=from_account.currency,
                amount=usd_amount,
                exchange_rate=rate,
                category='Currency Exchange',
                comment=comment or f'Currency exchange to {to_account.name}',
                status=FinanceTransaction.TransactionStatus.APPROVED,
                # created_by=user,  # Skip for testing
                # approved_by=user,
                # approved_at=timezone.now()
            )
            
            # Try to validate without saving
            usd_transaction.full_clean()
            print("✓ USD transaction validation passed")
            
        except Exception as e:
            print(f"✗ USD transaction validation failed: {e}")
            import traceback
            traceback.print_exc()
            
except Exception as e:
    print(f"\n✗ Serializer validation failed: {e}")
    if hasattr(serializer, 'errors'):
        print(f"Errors: {serializer.errors}")
