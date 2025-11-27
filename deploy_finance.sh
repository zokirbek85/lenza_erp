#!/bin/bash

# Finance Sources + Expenses - Deployment Script
# Run this script to deploy the Finance subsystem

set -e  # Exit on error

echo "========================================"
echo "Finance Sources + Expenses Deployment"
echo "========================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "Error: manage.py not found. Please run this script from the backend directory."
    exit 1
fi

# Step 1: Run migrations
echo "[1/4] Running database migrations..."
python manage.py migrate payments

# Step 2: Create initial expense categories
echo "[2/4] Creating initial expense categories..."
python manage.py shell << EOF
from payments.models import ExpenseCategory

categories = [
    {"name": "Office Supplies", "description": "Pens, paper, and office equipment"},
    {"name": "Utilities", "description": "Electricity, water, internet"},
    {"name": "Salaries", "description": "Employee salaries and bonuses"},
    {"name": "Marketing", "description": "Advertising and promotional expenses"},
    {"name": "Travel", "description": "Business travel and accommodation"},
    {"name": "Maintenance", "description": "Equipment and facility maintenance"},
    {"name": "Insurance", "description": "Business insurance premiums"},
    {"name": "Professional Services", "description": "Consulting, legal, accounting"},
]

for cat_data in categories:
    ExpenseCategory.objects.get_or_create(
        name=cat_data["name"],
        defaults={"description": cat_data["description"]}
    )
    print(f"✓ Created category: {cat_data['name']}")

print(f"\\nTotal expense categories: {ExpenseCategory.objects.count()}")
EOF

# Step 3: Create initial finance sources
echo "[3/4] Creating initial finance sources..."
python manage.py shell << EOF
from payments.models import FinanceSource

sources = [
    {"name": "Main Cash USD", "type": "cash", "currency": "USD", "description": "Primary USD cash register"},
    {"name": "Main Cash UZS", "type": "cash", "currency": "UZS", "description": "Primary UZS cash register"},
    {"name": "Company Bank Account USD", "type": "bank", "currency": "USD", "description": "Primary business bank account"},
    {"name": "Company Bank Account UZS", "type": "bank", "currency": "UZS", "description": "Local currency bank account"},
]

for src_data in sources:
    FinanceSource.objects.get_or_create(
        name=src_data["name"],
        defaults={
            "type": src_data["type"],
            "currency": src_data["currency"],
            "description": src_data["description"],
            "is_active": True,
        }
    )
    print(f"✓ Created finance source: {src_data['name']}")

print(f"\\nTotal finance sources: {FinanceSource.objects.count()}")
EOF

# Step 4: Verification
echo "[4/4] Verifying installation..."
python manage.py shell << EOF
from payments.models import FinanceSource, ExpenseCategory, Expense, FinanceLog
from django.contrib.contenttypes.models import ContentType

print(f"✓ FinanceSource model accessible")
print(f"✓ ExpenseCategory model accessible")
print(f"✓ Expense model accessible")
print(f"✓ FinanceLog model accessible")

print(f"\\nInstallation verified successfully!")
print(f"- Finance Sources: {FinanceSource.objects.count()}")
print(f"- Expense Categories: {ExpenseCategory.objects.count()}")
print(f"- Expenses: {Expense.objects.count()}")
print(f"- Finance Logs: {FinanceLog.objects.count()}")
EOF

echo ""
echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Update Payment records to link to FinanceSources"
echo "2. Train users on expense approval workflow"
echo "3. Configure expense categories for your business"
echo "4. Set up initial finance source balances"
echo ""
echo "Access the new features:"
echo "- Admin: http://yourserver/admin/payments/"
echo "- API: http://yourserver/api/finance-sources/"
echo "- API: http://yourserver/api/expenses/"
echo "- Frontend: http://yourserver/finance-sources"
echo "- Frontend: http://yourserver/expenses"
echo ""
