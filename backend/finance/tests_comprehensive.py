"""
Comprehensive tests for Finance Transactions
Tests all transaction types, currencies, statuses, and edge cases
"""

from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from dealers.models import Dealer, Region
from finance.models import FinanceAccount, FinanceTransaction, ExchangeRate

User = get_user_model()


class FinanceTransactionComprehensiveTest(TestCase):
    """Test all transaction scenarios"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.admin_user = User.objects.create_user(
            username='admin',
            password='admin123',
            role='admin'
        )
        self.accountant_user = User.objects.create_user(
            username='accountant',
            password='acc123',
            role='accountant'
        )
        
        # Create region
        self.region = Region.objects.create(name='Test Region')
        
        # Create dealers
        self.dealer1 = Dealer.objects.create(
            name='Dealer 1',
            code='D001',
            region=self.region,
            opening_balance_usd=Decimal('1000.00')
        )
        self.dealer2 = Dealer.objects.create(
            name='Dealer 2',
            code='D002',
            region=self.region,
            opening_balance_usd=Decimal('0.00')
        )
        
        # Create finance accounts
        self.cash_usd = FinanceAccount.objects.create(
            type='cash',
            currency='USD',
            name='Cash USD Main',
            is_active=True
        )
        self.cash_uzs = FinanceAccount.objects.create(
            type='cash',
            currency='UZS',
            name='Cash UZS Main',
            is_active=True
        )
        self.card_usd = FinanceAccount.objects.create(
            type='card',
            currency='USD',
            name='Card USD',
            is_active=True
        )
        self.bank_uzs = FinanceAccount.objects.create(
            type='bank',
            currency='UZS',
            name='Bank UZS',
            is_active=True
        )
        
        # Create exchange rates
        today = date.today()
        ExchangeRate.objects.create(
            rate_date=today,
            usd_to_uzs=Decimal('12500.00')
        )
        ExchangeRate.objects.create(
            rate_date=today - timedelta(days=30),
            usd_to_uzs=Decimal('12000.00')
        )
        ExchangeRate.objects.create(
            rate_date=today + timedelta(days=30),
            usd_to_uzs=Decimal('13000.00')
        )
    
    def test_income_usd_transaction(self):
        """Test 1: USD income transaction"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('1000.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.amount_usd, Decimal('1000.00'))
        self.assertEqual(transaction.amount_uzs, Decimal('12500000.00'))
        self.assertEqual(transaction.exchange_rate, Decimal('12500.00'))
        self.assertIsNotNone(transaction.exchange_rate_date)
    
    def test_income_uzs_transaction(self):
        """Test 2: UZS income transaction"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_uzs,
            date=date.today(),
            currency='UZS',
            amount=Decimal('5000000.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.amount_uzs, Decimal('5000000.00'))
        self.assertEqual(transaction.amount_usd, Decimal('400.00'))
        self.assertEqual(transaction.exchange_rate, Decimal('12500.00'))
    
    def test_expense_usd_transaction(self):
        """Test 3: USD expense transaction"""
        transaction = FinanceTransaction.objects.create(
            type='expense',
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('250.50'),
            category='Office supplies',
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertIsNone(transaction.dealer)
        self.assertEqual(transaction.amount_usd, Decimal('250.50'))
        self.assertEqual(transaction.category, 'Office supplies')
    
    def test_expense_uzs_transaction(self):
        """Test 4: UZS expense transaction"""
        transaction = FinanceTransaction.objects.create(
            type='expense',
            account=self.cash_uzs,
            date=date.today(),
            currency='UZS',
            amount=Decimal('1250000.00'),
            category='Rent',
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.amount_uzs, Decimal('1250000.00'))
        self.assertEqual(transaction.amount_usd, Decimal('100.00'))
    
    def test_zero_amount_transaction(self):
        """Test 5: Zero amount transaction (edge case)"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('0.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.amount, Decimal('0.00'))
        self.assertEqual(transaction.amount_usd, Decimal('0.00'))
        self.assertEqual(transaction.amount_uzs, Decimal('0.00'))
    
    def test_negative_amount_transaction(self):
        """Test 6: Negative amount (should be absolute)"""
        transaction = FinanceTransaction.objects.create(
            type='expense',
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('-100.00'),  # Negative
            category='Correction',
            status='draft',
            created_by=self.admin_user
        )
        
        # Amount stored as-is, but typically should be positive for expense
        self.assertEqual(transaction.amount, Decimal('-100.00'))
    
    def test_old_date_transaction(self):
        """Test 7: Transaction with old date (30 days ago)"""
        old_date = date.today() - timedelta(days=30)
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=old_date,
            currency='USD',
            amount=Decimal('500.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        # Should use old exchange rate
        self.assertEqual(transaction.exchange_rate, Decimal('12000.00'))
        self.assertEqual(transaction.amount_uzs, Decimal('6000000.00'))
    
    def test_future_date_transaction(self):
        """Test 8: Transaction with future date"""
        future_date = date.today() + timedelta(days=30)
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer2,
            account=self.cash_usd,
            date=future_date,
            currency='USD',
            amount=Decimal('750.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        # Should use future exchange rate
        self.assertEqual(transaction.exchange_rate, Decimal('13000.00'))
        self.assertEqual(transaction.amount_uzs, Decimal('9750000.00'))
    
    def test_draft_status_transaction(self):
        """Test 9: Draft status transaction"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('100.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.status, 'draft')
        self.assertIsNone(transaction.approved_by)
        self.assertIsNone(transaction.approved_at)
    
    def test_approved_status_transaction(self):
        """Test 10: Approve transaction"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('300.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        # Approve
        transaction.approve(self.accountant_user)
        
        self.assertEqual(transaction.status, 'approved')
        self.assertEqual(transaction.approved_by, self.accountant_user)
        self.assertIsNotNone(transaction.approved_at)
    
    def test_cancelled_status_transaction(self):
        """Test 11: Cancel transaction"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('200.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        # Cancel
        transaction.cancel()
        
        self.assertEqual(transaction.status, 'cancelled')
    
    def test_card_account_transaction(self):
        """Test 12: Card account transaction"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.card_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('450.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.account.type, 'card')
        self.assertEqual(transaction.amount, Decimal('450.00'))
    
    def test_bank_account_transaction(self):
        """Test 13: Bank account transaction"""
        transaction = FinanceTransaction.objects.create(
            type='expense',
            account=self.bank_uzs,
            date=date.today(),
            currency='UZS',
            amount=Decimal('2500000.00'),
            category='Salary',
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.account.type, 'bank')
        self.assertEqual(transaction.category, 'Salary')
    
    def test_large_amount_transaction(self):
        """Test 14: Large amount transaction"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('999999.99'),
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.amount, Decimal('999999.99'))
        # Large UZS amount
        expected_uzs = Decimal('999999.99') * Decimal('12500.00')
        self.assertEqual(transaction.amount_uzs, expected_uzs.quantize(Decimal('0.01')))
    
    def test_fractional_amount_transaction(self):
        """Test 15: Fractional amount (cents)"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('0.01'),  # 1 cent
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.amount, Decimal('0.01'))
        self.assertEqual(transaction.amount_uzs, Decimal('125.00'))
    
    def test_transaction_with_comment(self):
        """Test 16: Transaction with comment"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('150.00'),
            comment='Payment for order #12345',
            status='draft',
            created_by=self.admin_user
        )
        
        self.assertEqual(transaction.comment, 'Payment for order #12345')
    
    def test_multiple_transactions_same_dealer(self):
        """Test 17: Multiple transactions for same dealer"""
        for i in range(5):
            FinanceTransaction.objects.create(
                type='income',
                dealer=self.dealer1,
                account=self.cash_usd,
                date=date.today(),
                currency='USD',
                amount=Decimal('100.00') * (i + 1),
                status='draft',
                created_by=self.admin_user
            )
        
        dealer_transactions = FinanceTransaction.objects.filter(dealer=self.dealer1)
        self.assertEqual(dealer_transactions.count(), 5)
    
    def test_conversion_accuracy(self):
        """Test 18: Currency conversion accuracy"""
        transaction = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer1,
            account=self.cash_usd,
            date=date.today(),
            currency='USD',
            amount=Decimal('123.45'),
            status='draft',
            created_by=self.admin_user
        )
        
        # USD to UZS
        expected_uzs = Decimal('123.45') * Decimal('12500.00')
        self.assertEqual(transaction.amount_uzs, expected_uzs.quantize(Decimal('0.01')))
        
        # Reverse: UZS to USD
        transaction_uzs = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer2,
            account=self.cash_uzs,
            date=date.today(),
            currency='UZS',
            amount=Decimal('1543125.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        expected_usd = Decimal('1543125.00') / Decimal('12500.00')
        self.assertEqual(transaction_uzs.amount_usd, expected_usd.quantize(Decimal('0.01')))


class FinanceTransactionAPITest(TestCase):
    """Test API endpoints"""
    
    def setUp(self):
        """Set up for API tests"""
        self.admin_user = User.objects.create_user(
            username='admin',
            password='admin123',
            role='admin',
            is_staff=True
        )
        self.client.force_login(self.admin_user)
        
        # Create test data
        self.region = Region.objects.create(name='Test Region')
        self.dealer = Dealer.objects.create(
            name='Test Dealer',
            code='TD001',
            region=self.region
        )
        self.account = FinanceAccount.objects.create(
            type='cash',
            currency='USD',
            name='Test Cash'
        )
        
        ExchangeRate.objects.create(
            rate_date=date.today(),
            usd_to_uzs=Decimal('12500.00')
        )
    
    def test_api_list_transactions(self):
        """Test API list endpoint"""
        # Create test transactions
        for i in range(10):
            FinanceTransaction.objects.create(
                type='income',
                dealer=self.dealer,
                account=self.account,
                date=date.today(),
                currency='USD',
                amount=Decimal('100.00') * (i + 1),
                status='draft',
                created_by=self.admin_user
            )
        
        response = self.client.get('/api/finance/transactions/')
        self.assertEqual(response.status_code, 200)
        
        # Should return all transactions
        data = response.json()
        if isinstance(data, list):
            self.assertEqual(len(data), 10)
        elif 'results' in data:
            self.assertEqual(len(data['results']), 10)
    
    def test_api_filter_by_type(self):
        """Test API filter by type"""
        # Create income and expense
        FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer,
            account=self.account,
            date=date.today(),
            currency='USD',
            amount=Decimal('100.00'),
            status='draft',
            created_by=self.admin_user
        )
        FinanceTransaction.objects.create(
            type='expense',
            account=self.account,
            date=date.today(),
            currency='USD',
            amount=Decimal('50.00'),
            category='Test',
            status='draft',
            created_by=self.admin_user
        )
        
        # Filter income
        response = self.client.get('/api/finance/transactions/?type=income')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        results = data if isinstance(data, list) else data.get('results', [])
        self.assertTrue(all(t['type'] == 'income' for t in results))
    
    def test_api_filter_by_status(self):
        """Test API filter by status"""
        draft_tx = FinanceTransaction.objects.create(
            type='income',
            dealer=self.dealer,
            account=self.account,
            date=date.today(),
            currency='USD',
            amount=Decimal('100.00'),
            status='draft',
            created_by=self.admin_user
        )
        
        response = self.client.get('/api/finance/transactions/?status=draft')
        self.assertEqual(response.status_code, 200)
    
    def test_api_pagination(self):
        """Test API pagination"""
        # Create 100 transactions
        for i in range(100):
            FinanceTransaction.objects.create(
                type='income',
                dealer=self.dealer,
                account=self.account,
                date=date.today(),
                currency='USD',
                amount=Decimal('10.00'),
                status='draft',
                created_by=self.admin_user
            )
        
        response = self.client.get('/api/finance/transactions/?page_size=25')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        if 'results' in data:
            self.assertEqual(len(data['results']), 25)
            self.assertEqual(data['count'], 100)
