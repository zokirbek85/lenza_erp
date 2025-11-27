# Finance Sources + Expenses - Deployment Script (Windows PowerShell)
# Run this script to deploy the Finance subsystem

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Finance Sources + Expenses Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "manage.py")) {
    Write-Host "Error: manage.py not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Get Python executable
$python = "python"
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    $python = "python"
} elseif (Get-Command "python3" -ErrorAction SilentlyContinue) {
    $python = "python3"
} else {
    Write-Host "Error: Python not found in PATH" -ForegroundColor Red
    exit 1
}

# Step 1: Run migrations
Write-Host "[1/4] Running database migrations..." -ForegroundColor Yellow
& $python manage.py migrate payments

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Migration failed" -ForegroundColor Red
    exit 1
}

# Step 2: Create initial expense categories
Write-Host "[2/4] Creating initial expense categories..." -ForegroundColor Yellow
$categoryScript = @"
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
    obj, created = ExpenseCategory.objects.get_or_create(
        name=cat_data["name"],
        defaults={"description": cat_data["description"]}
    )
    status = "Created" if created else "Exists"
    print(f"{status}: {cat_data['name']}")

print(f"\nTotal expense categories: {ExpenseCategory.objects.count()}")
"@

$categoryScript | & $python manage.py shell

# Step 3: Create initial finance sources
Write-Host "[3/4] Creating initial finance sources..." -ForegroundColor Yellow
$sourceScript = @"
from payments.models import FinanceSource

sources = [
    {"name": "Main Cash USD", "type": "cash", "currency": "USD", "description": "Primary USD cash register"},
    {"name": "Main Cash UZS", "type": "cash", "currency": "UZS", "description": "Primary UZS cash register"},
    {"name": "Company Bank Account USD", "type": "bank", "currency": "USD", "description": "Primary business bank account"},
    {"name": "Company Bank Account UZS", "type": "bank", "currency": "UZS", "description": "Local currency bank account"},
]

for src_data in sources:
    obj, created = FinanceSource.objects.get_or_create(
        name=src_data["name"],
        defaults={
            "type": src_data["type"],
            "currency": src_data["currency"],
            "description": src_data["description"],
            "is_active": True,
        }
    )
    status = "Created" if created else "Exists"
    print(f"{status}: {src_data['name']}")

print(f"\nTotal finance sources: {FinanceSource.objects.count()}")
"@

$sourceScript | & $python manage.py shell

# Step 4: Verification
Write-Host "[4/4] Verifying installation..." -ForegroundColor Yellow
$verifyScript = @"
from payments.models import FinanceSource, ExpenseCategory, Expense, FinanceLog

print("✓ FinanceSource model accessible")
print("✓ ExpenseCategory model accessible")
print("✓ Expense model accessible")
print("✓ FinanceLog model accessible")

print(f"\nInstallation verified successfully!")
print(f"- Finance Sources: {FinanceSource.objects.count()}")
print(f"- Expense Categories: {ExpenseCategory.objects.count()}")
print(f"- Expenses: {Expense.objects.count()}")
print(f"- Finance Logs: {FinanceLog.objects.count()}")
"@

$verifyScript | & $python manage.py shell

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update Payment records to link to FinanceSources"
Write-Host "2. Train users on expense approval workflow"
Write-Host "3. Configure expense categories for your business"
Write-Host "4. Set up initial finance source balances"
Write-Host ""
Write-Host "Access the new features:" -ForegroundColor Cyan
Write-Host "- Admin: http://yourserver/admin/payments/"
Write-Host "- API: http://yourserver/api/finance-sources/"
Write-Host "- API: http://yourserver/api/expenses/"
Write-Host "- Frontend: http://yourserver/finance-sources"
Write-Host "- Frontend: http://yourserver/expenses"
Write-Host ""
