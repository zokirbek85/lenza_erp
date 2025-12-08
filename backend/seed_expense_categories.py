"""
Seed default expense categories for existing users
Run: python manage.py shell < seed_expense_categories.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from finance.models import ExpenseCategory, DEFAULT_EXPENSE_CATEGORIES

User = get_user_model()

def seed_categories():
    """Create default expense categories for all existing users"""
    users = User.objects.all()
    
    created_count = 0
    skipped_count = 0
    
    for user in users:
        print(f"\nProcessing user: {user.username} (ID: {user.id})")
        
        for category_data in DEFAULT_EXPENSE_CATEGORIES:
            # Check if category already exists
            if ExpenseCategory.objects.filter(
                user=user,
                name=category_data['name']
            ).exists():
                print(f"  ⏭️  Skipping '{category_data['name']}' - already exists")
                skipped_count += 1
                continue
            
            # Create category
            category = ExpenseCategory.objects.create(
                user=user,
                **category_data
            )
            print(f"  ✅ Created '{category.name}'")
            created_count += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Created: {created_count} categories")
    print(f"⏭️  Skipped: {skipped_count} categories (already existed)")
    print(f"{'='*60}")

if __name__ == '__main__':
    print("="*60)
    print("Seeding Default Expense Categories")
    print("="*60)
    seed_categories()
