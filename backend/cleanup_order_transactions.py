#!/usr/bin/env python
"""
Database cleanup script for removing auto-generated order transactions.

This script should be run ONCE after deploying the order-payment separation fix.
It removes all FinanceTransaction records that were automatically created from orders.

Usage:
    python backend/cleanup_order_transactions.py

    Or via Django shell:
    python backend/manage.py shell < backend/cleanup_order_transactions.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.models import FinanceTransaction
from django.db import transaction


def cleanup_auto_generated_transactions():
    """Remove auto-generated transactions from orders."""
    
    print("=" * 60)
    print("Order Transaction Cleanup Script")
    print("=" * 60)
    print()
    
    # Find auto-generated transactions
    auto_transactions = FinanceTransaction.objects.filter(
        comment__icontains='Order #',
        category='Order Income'
    )
    
    total_count = auto_transactions.count()
    
    if total_count == 0:
        print("✅ No auto-generated transactions found.")
        print("   Database is clean!")
        return
    
    print(f"Found {total_count} auto-generated transaction(s):")
    print()
    
    # Show details
    for txn in auto_transactions[:10]:  # Show first 10
        print(f"  ID: {txn.id}")
        print(f"  Dealer: {txn.dealer.name if txn.dealer else 'N/A'}")
        print(f"  Amount: {txn.amount} {txn.currency}")
        print(f"  Status: {txn.status}")
        print(f"  Comment: {txn.comment}")
        print(f"  Created: {txn.created_at}")
        print()
    
    if total_count > 10:
        print(f"  ... and {total_count - 10} more")
        print()
    
    # Confirm deletion
    print("⚠️  WARNING: This will DELETE these transactions permanently!")
    print()
    
    # In production, require confirmation
    if '--force' not in sys.argv:
        response = input("Type 'DELETE' to confirm: ")
        if response != 'DELETE':
            print("❌ Aborted. No changes made.")
            return
    
    # Delete in transaction
    with transaction.atomic():
        deleted_draft = auto_transactions.filter(status='draft').delete()
        deleted_approved = auto_transactions.filter(status='approved').update(
            status='cancelled',
            comment=lambda x: f"[AUTO-GENERATED - CANCELLED] {x}"
        )
        
        print()
        print("✅ Cleanup completed:")
        print(f"   - {deleted_draft[0]} draft transactions deleted")
        print(f"   - {deleted_approved} approved transactions cancelled")
        print()
        print("   Approved transactions were cancelled instead of deleted")
        print("   to preserve audit trail.")
    
    # Verify
    remaining = FinanceTransaction.objects.filter(
        comment__icontains='Order #',
        category='Order Income',
        status__in=['draft', 'approved']
    ).count()
    
    if remaining == 0:
        print()
        print("✅ SUCCESS: All auto-generated transactions cleaned up!")
    else:
        print()
        print(f"⚠️  WARNING: {remaining} transactions still exist.")
        print("   Please review manually.")


def show_statistics():
    """Show transaction statistics after cleanup."""
    print()
    print("=" * 60)
    print("Transaction Statistics")
    print("=" * 60)
    print()
    
    total = FinanceTransaction.objects.count()
    approved = FinanceTransaction.objects.filter(status='approved').count()
    draft = FinanceTransaction.objects.filter(status='draft').count()
    cancelled = FinanceTransaction.objects.filter(status='cancelled').count()
    
    income = FinanceTransaction.objects.filter(
        status='approved',
        type='income'
    ).count()
    
    expense = FinanceTransaction.objects.filter(
        status='approved',
        type='expense'
    ).count()
    
    print(f"Total transactions: {total}")
    print(f"  - Approved: {approved}")
    print(f"  - Draft: {draft}")
    print(f"  - Cancelled: {cancelled}")
    print()
    print(f"Approved transactions:")
    print(f"  - Income: {income}")
    print(f"  - Expense: {expense}")
    print()


if __name__ == '__main__':
    try:
        cleanup_auto_generated_transactions()
        show_statistics()
    except Exception as e:
        print()
        print("❌ ERROR occurred:")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
