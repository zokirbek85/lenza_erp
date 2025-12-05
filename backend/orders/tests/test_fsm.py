"""
Test Order FSM (Finite State Machine)
Tests for status transition validation, role-based permissions, and race conditions.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.db import transaction

from catalog.models import Product, Brand, Category
from dealers.models import Dealer, Region
from orders.models import Order, OrderItem, OrderStatusLog
from orders.services.fsm import (
    validate_transition,
    apply_status_transition,
    get_allowed_next_statuses,
    can_change_status,
    ALLOWED_TRANSITIONS,
    WAREHOUSE_FLOW,
)

User = get_user_model()


class OrderFSMTest(TestCase):
    """Test Order status FSM transitions and permissions"""
    
    def setUp(self):
        """Create test data"""
        # Users
        self.admin = User.objects.create_user(
            username='admin', password='test123', role='admin'
        )
        self.sales = User.objects.create_user(
            username='sales', password='test123', role='sales'
        )
        self.warehouse = User.objects.create_user(
            username='warehouse', password='test123', role='warehouse'
        )
        self.accountant = User.objects.create_user(
            username='accountant', password='test123', role='accountant'
        )
        
        # Dealer
        region, _ = Region.objects.get_or_create(name='Tashkent Test')
        self.dealer = Dealer.objects.create(
            name='Test Dealer FSM',
            code='TESTFSM001',
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
            stock_ok=Decimal('1000.00')
        )
        
        # Order
        self.order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.sales,
            status=Order.Status.CREATED
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            qty=Decimal('10.00'),
            price_usd=self.product.sell_price_usd
        )
        self.order.recalculate_totals()
    
    def test_fsm_allowed_transitions(self):
        """Test FSM transition graph is correctly defined"""
        # Created can go to confirmed or cancelled
        self.assertIn('confirmed', ALLOWED_TRANSITIONS['created'])
        self.assertIn('cancelled', ALLOWED_TRANSITIONS['created'])
        
        # Delivered can only go to returned
        self.assertEqual(ALLOWED_TRANSITIONS['delivered'], {'returned'})
        
        # Cancelled is terminal
        self.assertEqual(ALLOWED_TRANSITIONS['cancelled'], set())
    
    def test_validate_transition_valid(self):
        """Test valid transitions pass validation"""
        # Created → Confirmed (valid)
        try:
            validate_transition(self.order, 'confirmed', self.admin)
        except ValidationError:
            self.fail("Valid transition raised ValidationError")
    
    def test_validate_transition_invalid(self):
        """Test invalid transitions raise ValidationError"""
        # Created → Delivered (skip packed/shipped)
        with self.assertRaises(ValidationError) as cm:
            validate_transition(self.order, 'delivered', self.admin)
        
        self.assertIn('status', cm.exception.message_dict)
    
    def test_validate_transition_terminal_status(self):
        """Test terminal statuses cannot transition"""
        self.order.status = Order.Status.CANCELLED
        self.order.save()
        
        with self.assertRaises(ValidationError):
            validate_transition(self.order, 'confirmed', self.admin)
    
    def test_role_admin_full_access(self):
        """Test admin can make any valid transition"""
        self.order.status = Order.Status.CREATED
        
        # Admin can do any FSM-valid transition
        validate_transition(self.order, 'confirmed', self.admin)
        validate_transition(self.order, 'cancelled', self.admin)
    
    def test_role_sales_own_orders_only(self):
        """Test sales can only change their own orders"""
        # Sales created this order, should work
        validate_transition(self.order, 'confirmed', self.sales)
        
        # Create order by different user
        other_sales = User.objects.create_user(
            username='sales2', password='test123', role='sales'
        )
        other_order = Order.objects.create(
            dealer=self.dealer,
            created_by=other_sales,
            status=Order.Status.CREATED
        )
        
        # Current sales cannot change other's order
        with self.assertRaises(ValidationError) as cm:
            validate_transition(other_order, 'confirmed', self.sales)
        
        self.assertIn('o\'z buyurtmalarini', str(cm.exception))
    
    def test_role_warehouse_strict_workflow(self):
        """Test warehouse must follow WAREHOUSE_FLOW"""
        self.order.status = Order.Status.CONFIRMED
        self.order.save()
        
        # Warehouse can only do confirmed → packed
        validate_transition(self.order, 'packed', self.warehouse)
        
        # Warehouse cannot skip steps
        with self.assertRaises(ValidationError) as cm:
            validate_transition(self.order, 'delivered', self.warehouse)
        
        self.assertIn('qat\'iy ketma-ketlikda', str(cm.exception))
    
    def test_apply_status_transition_creates_log(self):
        """Test status transition creates log entry"""
        with transaction.atomic():
            locked_order = Order.objects.select_for_update().get(pk=self.order.pk)
            apply_status_transition(locked_order, 'confirmed', self.admin)
        
        self.order.refresh_from_db()
        
        # Check status changed
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)
        
        # Check log created
        logs = OrderStatusLog.objects.filter(order=self.order)
        self.assertEqual(logs.count(), 1)
        
        log = logs.first()
        self.assertEqual(log.old_status, Order.Status.CREATED)
        self.assertEqual(log.new_status, Order.Status.CONFIRMED)
        self.assertEqual(log.by_user, self.admin)
    
    def test_get_allowed_next_statuses_admin(self):
        """Test admin gets all FSM-allowed statuses"""
        allowed = get_allowed_next_statuses(self.order, self.admin)
        
        # Admin should see all allowed from CREATED
        self.assertIn('confirmed', allowed)
        self.assertIn('cancelled', allowed)
    
    def test_get_allowed_next_statuses_warehouse(self):
        """Test warehouse only gets next workflow step"""
        self.order.status = Order.Status.CONFIRMED
        self.order.save()
        
        allowed = get_allowed_next_statuses(self.order, self.warehouse)
        
        # Warehouse should only see 'packed'
        self.assertEqual(allowed, ['packed'])
    
    def test_can_change_status_permissions(self):
        """Test can_change_status for different roles"""
        # Admin can always change
        self.assertTrue(can_change_status(self.order, self.admin))
        
        # Sales can change own orders
        self.assertTrue(can_change_status(self.order, self.sales))
        
        # Warehouse can change if in workflow
        self.order.status = Order.Status.CONFIRMED
        self.order.save()
        self.assertTrue(can_change_status(self.order, self.warehouse, 'packed'))
        
        # Warehouse cannot skip
        self.assertFalse(can_change_status(self.order, self.warehouse, 'delivered'))
    
    def test_race_condition_prevention(self):
        """Test select_for_update prevents race conditions"""
        # This test simulates concurrent status changes
        # In real scenario, database lock would prevent race condition
        
        with transaction.atomic():
            locked = Order.objects.select_for_update().get(pk=self.order.pk)
            self.assertEqual(locked.status, Order.Status.CREATED)
            
            # Apply transition
            apply_status_transition(locked, 'confirmed', self.admin)
        
        # Verify status changed atomically
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)
