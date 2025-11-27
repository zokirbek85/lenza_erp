"""
Seed initial data for Finance Sources + Expenses module
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ.setdefault('ENV', 'development')
os.environ.setdefault('USE_POSTGRES', 'false')
django.setup()

from payments.models import ExpenseCategory, FinanceSource

def seed_data():
    print("Seeding Finance Sources + Expenses data...")
    print("=" * 50)
    
    # Create expense categories
    print("\nCreating expense categories...")
    categories = [
        {'name': 'Office Supplies', 'description': 'Pens, paper, and office equipment'},
        {'name': 'Utilities', 'description': 'Electricity, water, internet'},
        {'name': 'Salaries', 'description': 'Employee salaries and bonuses'},
        {'name': 'Marketing', 'description': 'Advertising and promotional expenses'},
        {'name': 'Travel', 'description': 'Business travel and accommodation'},
        {'name': 'Maintenance', 'description': 'Equipment and facility maintenance'},
        {'name': 'Insurance', 'description': 'Business insurance premiums'},
        {'name': 'Professional Services', 'description': 'Consulting, legal, accounting'},
    ]
    
    for cat_data in categories:
        obj, created = ExpenseCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={'description': cat_data['description']}
        )
        status = '✓ Created' if created else '✓ Exists'
        print(f"  {status}: {cat_data['name']}")
    
    # Create finance sources
    print("\nCreating finance sources...")
    sources = [
        {'name': 'Main Cash USD', 'type': 'cash', 'currency': 'USD', 'description': 'Primary USD cash register'},
        {'name': 'Main Cash UZS', 'type': 'cash', 'currency': 'UZS', 'description': 'Primary UZS cash register'},
        {'name': 'Company Bank Account USD', 'type': 'bank', 'currency': 'USD', 'description': 'Primary business bank account'},
        {'name': 'Company Bank Account UZS', 'type': 'bank', 'currency': 'UZS', 'description': 'Local currency bank account'},
    ]
    
    for src_data in sources:
        obj, created = FinanceSource.objects.get_or_create(
            name=src_data['name'],
            defaults={
                'type': src_data['type'],
                'currency': src_data['currency'],
                'description': src_data['description'],
                'is_active': True,
            }
        )
        status = '✓ Created' if created else '✓ Exists'
        print(f"  {status}: {src_data['name']} ({src_data['currency']})")
    
    # Summary
    print("\n" + "=" * 50)
    print("Seed data completed successfully!")
    print(f"Total expense categories: {ExpenseCategory.objects.count()}")
    print(f"Total finance sources: {FinanceSource.objects.count()}")
    print("=" * 50)

if __name__ == '__main__':
    seed_data()
