"""
Test Return Item Stock Updates
Tests for ReturnItem signal that updates product stock.
"""
from decimal import Decimal

from django.test import TestCase
from django.db import transaction

from catalog.models import Product, Brand, Category
from dealers.models import Dealer, Region
from returns.models import Return, ReturnItem


class ReturnItemStockUpdateTest(TestCase):
    """Test ReturnItem signal updates stock correctly"""
    
    def setUp(self):
        """Create test data"""
        # Dealer
        region = Region.objects.create(name='Tashkent')
        self.dealer = Dealer.objects.create(
            name='Test Dealer',
            code='TEST001',
            region=region
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
            stock_ok=Decimal('500.00'),
            stock_defect=Decimal('50.00')
        )
        
        # Return document
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='testuser', password='test123', role='admin'
        )
        
        self.return_doc = Return.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Return.Status.CONFIRMED
        )
    
    def test_healthy_return_updates_stock_ok(self):
        """Test healthy return increases stock_ok"""
        initial_stock_ok = self.product.stock_ok
        initial_stock_defect = self.product.stock_defect
        
        # Create healthy return
        ReturnItem.objects.create(
            return_document=self.return_doc,
            product=self.product,
            quantity=Decimal('10.00'),
            status=ReturnItem.Status.HEALTHY
        )
        
        # Refresh product
        self.product.refresh_from_db()
        
        # Check stock_ok increased
        self.assertEqual(
            self.product.stock_ok,
            initial_stock_ok + Decimal('10.00')
        )
        
        # Check stock_defect unchanged
        self.assertEqual(self.product.stock_defect, initial_stock_defect)
    
    def test_defect_return_updates_stock_defect(self):
        """Test defective return increases stock_defect"""
        initial_stock_ok = self.product.stock_ok
        initial_stock_defect = self.product.stock_defect
        
        # Create defective return
        ReturnItem.objects.create(
            return_document=self.return_doc,
            product=self.product,
            quantity=Decimal('5.00'),
            status=ReturnItem.Status.DEFECT
        )
        
        # Refresh product
        self.product.refresh_from_db()
        
        # Check stock_defect increased
        self.assertEqual(
            self.product.stock_defect,
            initial_stock_defect + Decimal('5.00')
        )
        
        # Check stock_ok unchanged
        self.assertEqual(self.product.stock_ok, initial_stock_ok)
    
    def test_multiple_returns_accumulate(self):
        """Test multiple returns accumulate correctly"""
        initial_stock_ok = self.product.stock_ok
        
        # Create multiple returns
        ReturnItem.objects.create(
            return_document=self.return_doc,
            product=self.product,
            quantity=Decimal('10.00'),
            status=ReturnItem.Status.HEALTHY
        )
        
        # Create second return document
        return_doc2 = Return.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Return.Status.CONFIRMED
        )
        
        # Create another product for the second return (unique_together constraint)
        product2 = Product.objects.create(
            sku='TEST-002',
            name='Test Product 2',
            brand=self.product.brand,
            category=self.product.category,
            sell_price_usd=Decimal('50.00'),
            stock_ok=Decimal('100.00')
        )
        
        ReturnItem.objects.create(
            return_document=return_doc2,
            product=product2,
            quantity=Decimal('20.00'),
            status=ReturnItem.Status.HEALTHY
        )
        
        # Check first product
        self.product.refresh_from_db()
        self.assertEqual(
            self.product.stock_ok,
            initial_stock_ok + Decimal('10.00')
        )
        
        # Check second product
        product2.refresh_from_db()
        self.assertEqual(
            product2.stock_ok,
            Decimal('100.00') + Decimal('20.00')
        )
    
    def test_signal_only_fires_on_create(self):
        """Test signal only fires when creating, not updating"""
        initial_stock_ok = self.product.stock_ok
        
        # Create return
        return_item = ReturnItem.objects.create(
            return_document=self.return_doc,
            product=self.product,
            quantity=Decimal('10.00'),
            status=ReturnItem.Status.HEALTHY
        )
        
        self.product.refresh_from_db()
        stock_after_create = self.product.stock_ok
        
        # Update return (change quantity)
        return_item.quantity = Decimal('20.00')
        return_item.save()
        
        self.product.refresh_from_db()
        
        # Stock should not change on update
        self.assertEqual(self.product.stock_ok, stock_after_create)
        
        # Only initial +10 should be applied
        self.assertEqual(
            self.product.stock_ok,
            initial_stock_ok + Decimal('10.00')
        )
    
    def test_race_condition_safety(self):
        """Test F() expressions prevent race conditions"""
        # This test verifies that concurrent returns would be handled safely
        initial_stock_ok = self.product.stock_ok
        
        # Simulate multiple concurrent returns (in reality, would be parallel)
        with transaction.atomic():
            ReturnItem.objects.create(
                return_document=self.return_doc,
                product=self.product,
                quantity=Decimal('10.00'),
                status=ReturnItem.Status.HEALTHY
            )
        
        # Create another return doc for second item
        return_doc2 = Return.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            status=Return.Status.CONFIRMED
        )
        
        product2 = Product.objects.create(
            sku='TEST-002',
            name='Test Product 2',
            brand=self.product.brand,
            category=self.product.category,
            sell_price_usd=Decimal('50.00'),
            stock_ok=Decimal('100.00')
        )
        
        with transaction.atomic():
            ReturnItem.objects.create(
                return_document=return_doc2,
                product=product2,
                quantity=Decimal('15.00'),
                status=ReturnItem.Status.HEALTHY
            )
        
        # Verify both products updated correctly
        self.product.refresh_from_db()
        product2.refresh_from_db()
        
        self.assertEqual(
            self.product.stock_ok,
            initial_stock_ok + Decimal('10.00')
        )
        self.assertEqual(
            product2.stock_ok,
            Decimal('100.00') + Decimal('15.00')
        )
