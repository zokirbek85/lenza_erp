"""
Test Dealer Balance Calculations
Tests for accurate balance calculations with returns and payments.
"""
from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from catalog.models import Product, Brand, Category
from dealers.models import Dealer, Region
from dealers.services.balance import calculate_dealer_balance
from finance.models import FinanceTransaction
from orders.models import Order, OrderItem, OrderReturn
from returns.models import Return, ReturnItem

User = get_user_model()


class DealerBalanceTest(TestCase):
    """Test dealer balance calculation service"""
    
    def setUp(self):
        """Create test data"""
        # User
        self.user = User.objects.create_user(
            username='testuser', password='test123', role='admin'
        )
        
        # Dealer
        region = Region.objects.create(name='Tashkent')
        self.dealer = Dealer.objects.create(
            name='Test Dealer',
            code='TEST001',
            region=region,
            opening_balance_usd=Decimal('1000.00'),
            opening_balance_uzs=Decimal('12800000.00')  # 1000 * 12800
        )
        
        # Product
        brand = Brand.objects.create(name='Test Brand')
        category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            sku='TEST-001',
            name='Test Product',
            brand=brand,
            category=category,
            sell_price_usd=Decimal('100.00'),
            cost_usd=Decimal('50.00'),
            stock_ok=Decimal('1000.00')
        )
    
    def test_balance_with_opening_only(self):
        """Test balance equals opening balance when no transactions"""
        result = calculate_dealer_balance(self.dealer)
        
        self.assertEqual(result['balance_usd'], Decimal('1000.00'))
        self.assertEqual(result['breakdown']['opening_balance_usd'], Decimal('1000.00'))
        self.assertEqual(result['breakdown']['total_orders_usd'], Decimal('0'))
    
    def test_balance_with_confirmed_order(self):
        """Test balance increases with confirmed order"""
        # Create confirmed order
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('500.00'),
            total_uzs=Decimal('6400000.00'),
            exchange_rate=Decimal('12800.00')
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Balance = 1000 + 500 = 1500
        self.assertEqual(result['balance_usd'], Decimal('1500.00'))
        self.assertEqual(result['breakdown']['total_orders_usd'], Decimal('500.00'))
    
    def test_balance_excludes_created_orders(self):
        """Test balance excludes CREATED (not confirmed) orders"""
        # Create order in CREATED status
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CREATED,
            total_usd=Decimal('500.00')
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Balance should not include CREATED order
        self.assertEqual(result['balance_usd'], Decimal('1000.00'))
        self.assertEqual(result['breakdown']['total_orders_usd'], Decimal('0'))
    
    def test_balance_excludes_cancelled_orders(self):
        """Test balance excludes CANCELLED orders"""
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CANCELLED,
            total_usd=Decimal('500.00')
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        self.assertEqual(result['balance_usd'], Decimal('1000.00'))
    
    def test_balance_excludes_imported_orders(self):
        """Test balance excludes imported orders"""
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('500.00'),
            is_imported=True  # Imported order
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Should not include imported order
        self.assertEqual(result['balance_usd'], Decimal('1000.00'))
    
    def test_balance_with_order_return(self):
        """Test balance decreases with OrderReturn"""
        # Create order
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.DELIVERED,
            total_usd=Decimal('500.00'),
            exchange_rate=Decimal('12800.00')
        )
        
        order_item = OrderItem.objects.create(
            order=order,
            product=self.product,
            qty=Decimal('5.00'),
            price_usd=Decimal('100.00')
        )
        
        # Create return
        order_return = OrderReturn.objects.create(
            order=order,
            item=order_item,
            quantity=Decimal('2.00'),
            amount_usd=Decimal('200.00'),
            amount_uzs=Decimal('2560000.00'),
            exchange_rate=Decimal('12800.00')
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Balance = 1000 + 500 - 200 = 1300
        self.assertEqual(result['balance_usd'], Decimal('1300.00'))
        self.assertEqual(result['breakdown']['order_returns_usd'], Decimal('200.00'))
    
    def test_balance_with_return_item(self):
        """Test balance includes ReturnItem (from returns module)"""
        # Create order first
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('1000.00')
        )
        
        # Create return document
        return_doc = Return.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Return.Status.CONFIRMED
        )
        
        # Create return item (healthy)
        return_item = ReturnItem.objects.create(
            return_document=return_doc,
            product=self.product,
            quantity=Decimal('3.00'),
            status=ReturnItem.Status.HEALTHY
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Return value = 3 * 100 = 300
        # Balance = 1000 + 1000 - 300 = 1700
        self.assertEqual(result['balance_usd'], Decimal('1700.00'))
        self.assertEqual(result['breakdown']['return_items_usd'], Decimal('300.00'))
    
    def test_balance_with_defective_return(self):
        """Test balance includes defective returns (not free)"""
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('1000.00')
        )
        
        return_doc = Return.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Return.Status.CONFIRMED
        )
        
        # Defective return still reduces balance
        return_item = ReturnItem.objects.create(
            return_document=return_doc,
            product=self.product,
            quantity=Decimal('5.00'),
            status=ReturnItem.Status.DEFECT  # Defective
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Defective return = 5 * 100 = 500
        # Balance = 1000 + 1000 - 500 = 1500
        self.assertEqual(result['balance_usd'], Decimal('1500.00'))
        self.assertEqual(result['breakdown']['return_items_usd'], Decimal('500.00'))
    
    def test_balance_with_approved_payment(self):
        """Test balance decreases with approved payment"""
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('1000.00')
        )
        
        # Create approved payment
        payment = FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            amount_usd=Decimal('300.00'),
            amount_uzs=Decimal('3840000.00'),
            currency='USD',
            date=date.today()
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Balance = 1000 + 1000 - 300 = 1700
        self.assertEqual(result['balance_usd'], Decimal('1700.00'))
        self.assertEqual(result['breakdown']['total_payments_usd'], Decimal('300.00'))
    
    def test_balance_excludes_draft_payment(self):
        """Test balance excludes DRAFT payments"""
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('1000.00')
        )
        
        # Create draft payment
        payment = FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.DRAFT,
            amount_usd=Decimal('300.00'),
            currency='USD',
            date=date.today()
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Draft payment should not be counted
        # Balance = 1000 + 1000 = 2000
        self.assertEqual(result['balance_usd'], Decimal('2000.00'))
        self.assertEqual(result['breakdown']['total_payments_usd'], Decimal('0'))
    
    def test_balance_complex_scenario(self):
        """Test complex scenario with orders, returns, and payments"""
        # Create multiple orders
        order1 = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('1000.00')
        )
        
        order2 = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.DELIVERED,
            total_usd=Decimal('500.00'),
            exchange_rate=Decimal('12800.00')
        )
        
        # OrderReturn
        order_item = OrderItem.objects.create(
            order=order2,
            product=self.product,
            qty=Decimal('5.00'),
            price_usd=Decimal('100.00')
        )
        
        order_return = OrderReturn.objects.create(
            order=order2,
            item=order_item,
            quantity=Decimal('1.00'),
            amount_usd=Decimal('100.00')
        )
        
        # ReturnItem
        return_doc = Return.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Return.Status.CONFIRMED
        )
        
        return_item = ReturnItem.objects.create(
            return_document=return_doc,
            product=self.product,
            quantity=Decimal('2.00'),
            status=ReturnItem.Status.HEALTHY
        )
        
        # Payment
        payment = FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            amount_usd=Decimal('700.00'),
            currency='USD',
            date=date.today()
        )
        
        result = calculate_dealer_balance(self.dealer)
        
        # Opening: 1000
        # Orders: 1000 + 500 = 1500
        # Returns: 100 (OrderReturn) + 200 (ReturnItem) = 300
        # Payments: 700
        # Balance = 1000 + 1500 - 300 - 700 = 1500
        self.assertEqual(result['balance_usd'], Decimal('1500.00'))
        
        # Check breakdown
        self.assertEqual(result['breakdown']['opening_balance_usd'], Decimal('1000.00'))
        self.assertEqual(result['breakdown']['total_orders_usd'], Decimal('1500.00'))
        self.assertEqual(result['breakdown']['total_returns_usd'], Decimal('300.00'))
        self.assertEqual(result['breakdown']['total_payments_usd'], Decimal('700.00'))
    
    def test_balance_property_uses_service(self):
        """Test Dealer.balance_usd property uses balance service"""
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Order.Status.CONFIRMED,
            total_usd=Decimal('500.00')
        )
        
        # Use property
        balance_from_property = self.dealer.balance_usd
        
        # Use service directly
        result = calculate_dealer_balance(self.dealer)
        balance_from_service = result['balance_usd']
        
        # Should match
        self.assertEqual(balance_from_property, balance_from_service)
        self.assertEqual(balance_from_property, Decimal('1500.00'))
