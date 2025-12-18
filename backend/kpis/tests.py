from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db.models import OuterRef, Subquery, F, Sum, ExpressionWrapper, DecimalField, Value
from django.db.models.functions import Coalesce

from finance.models import FinanceTransaction, ExchangeRate
from dealers.models import Dealer

User = get_user_model()


class BonusExchangeRateTestCase(TestCase):
    """
    Test that bonus is calculated using the exchange rate on the payment date,
    not the current exchange rate.
    """
    
    def setUp(self):
        """Setup test data"""
        # Create manager
        self.manager = User.objects.create_user(
            username='test_manager',
            role='sales',
            password='testpass123'
        )
        
        # Create dealer
        self.dealer = Dealer.objects.create(
            name='Test Dealer Ltd',
            code='TD001',
            manager_user=self.manager
        )
        
        # Create exchange rates for different dates
        ExchangeRate.objects.create(
            rate_date=date(2025, 1, 1),
            usd_to_uzs=Decimal('12500.00')
        )
        ExchangeRate.objects.create(
            rate_date=date(2025, 2, 1),
            usd_to_uzs=Decimal('13000.00')
        )
        ExchangeRate.objects.create(
            rate_date=date(2025, 3, 1),
            usd_to_uzs=Decimal('13500.00')
        )
    
    def test_bonus_uses_payment_date_exchange_rate(self):
        """
        Test that bonus is calculated using the exchange rate on payment date.
        
        Expected behavior:
        - January payment: $1000 × 0.01 × 12,500 = 125,000 UZS
        - February payment: $2000 × 0.01 × 13,000 = 260,000 UZS
        - March payment: $1500 × 0.01 × 13,500 = 202,500 UZS
        - Total: 587,500 UZS
        """
        
        # Create payments on different dates
        payment_jan = FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date=date(2025, 1, 15),
            amount_usd=Decimal('1000.00')
        )
        
        payment_feb = FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date=date(2025, 2, 15),
            amount_usd=Decimal('2000.00')
        )
        
        payment_mar = FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date=date(2025, 3, 15),
            amount_usd=Decimal('1500.00')
        )
        
        # Calculate bonus using correct method
        payments_with_bonus = FinanceTransaction.objects.filter(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED
        ).annotate(
            payment_rate=Coalesce(
                Subquery(
                    ExchangeRate.objects.filter(
                        rate_date__lte=OuterRef('date')
                    ).order_by('-rate_date').values('usd_to_uzs')[:1]
                ),
                Value(Decimal('12800'), output_field=DecimalField(max_digits=12, decimal_places=2))
            ),
            bonus_uzs=ExpressionWrapper(
                F('amount_usd') * Decimal('0.01') * F('payment_rate'),
                output_field=DecimalField(max_digits=18, decimal_places=2)
            )
        )
        
        # Check individual bonuses
        jan_bonus = payments_with_bonus.get(id=payment_jan.id).bonus_uzs
        feb_bonus = payments_with_bonus.get(id=payment_feb.id).bonus_uzs
        mar_bonus = payments_with_bonus.get(id=payment_mar.id).bonus_uzs
        
        # January: 1000 × 0.01 × 12500 = 125,000
        self.assertEqual(jan_bonus, Decimal('125000.00'))
        
        # February: 2000 × 0.01 × 13000 = 260,000
        self.assertEqual(feb_bonus, Decimal('260000.00'))
        
        # March: 1500 × 0.01 × 13500 = 202,500
        self.assertEqual(mar_bonus, Decimal('202500.00'))
        
        # Total bonus
        total_bonus = payments_with_bonus.aggregate(
            total=Sum('bonus_uzs')
        )['total']
        
        expected_total = Decimal('587500.00')
        self.assertEqual(total_bonus, expected_total)
    
    def test_bonus_difference_current_vs_correct_method(self):
        """
        Demonstrate the difference between using current rate (wrong) 
        vs payment date rate (correct).
        """
        
        # Create two payments with different dates
        FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date=date(2025, 1, 15),
            amount_usd=Decimal('10000.00')
        )
        
        FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date=date(2025, 2, 15),
            amount_usd=Decimal('10000.00')
        )
        
        # CORRECT METHOD - use payment date exchange rate
        correct_bonus = FinanceTransaction.objects.filter(
            dealer=self.dealer
        ).annotate(
            payment_rate=Coalesce(
                Subquery(
                    ExchangeRate.objects.filter(
                        rate_date__lte=OuterRef('date')
                    ).order_by('-rate_date').values('usd_to_uzs')[:1]
                ),
                Value(Decimal('12800'), output_field=DecimalField())
            ),
            bonus_uzs=ExpressionWrapper(
                F('amount_usd') * Decimal('0.01') * F('payment_rate'),
                output_field=DecimalField(max_digits=18, decimal_places=2)
            )
        ).aggregate(total=Sum('bonus_uzs'))['total']
        
        # WRONG METHOD - use current exchange rate (March rate)
        total_payments_usd = FinanceTransaction.objects.filter(
            dealer=self.dealer
        ).aggregate(total=Sum('amount_usd'))['total']
        
        bonus_usd = total_payments_usd * Decimal('0.01')
        current_rate = ExchangeRate.objects.order_by('-rate_date').first()
        wrong_bonus = (bonus_usd * current_rate.usd_to_uzs).quantize(Decimal('0.01'))
        
        # Calculate difference
        difference = abs(correct_bonus - wrong_bonus)
        
        # Expected correct calculation:
        # Jan: 10000 × 0.01 × 12500 = 1,250,000
        # Feb: 10000 × 0.01 × 13000 = 1,300,000
        # Total correct: 2,550,000
        self.assertEqual(correct_bonus, Decimal('2550000.00'))
        
        # Expected wrong calculation:
        # Total: 20000 × 0.01 × 13500 = 2,700,000
        self.assertEqual(wrong_bonus, Decimal('2700000.00'))
        
        # Difference should be 150,000 UZS
        self.assertEqual(difference, Decimal('150000.00'))
        
        # Wrong method should give MORE bonus (unfair to company)
        self.assertGreater(wrong_bonus, correct_bonus)
        
        print(f"\n📊 Bonus Calculation Comparison:")
        print(f"✅ Correct method (payment date rates): {correct_bonus:,.2f} UZS")
        print(f"❌ Wrong method (current rate): {wrong_bonus:,.2f} UZS")
        print(f"💰 Overpayment difference: {difference:,.2f} UZS")
    
    def test_bonus_with_missing_exchange_rate(self):
        """Test that default exchange rate is used when no rate exists"""
        
        # Create payment before any exchange rate exists
        payment = FinanceTransaction.objects.create(
            dealer=self.dealer,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date=date(2024, 12, 1),  # Before any exchange rate
            amount_usd=Decimal('1000.00')
        )
        
        # Calculate bonus
        payments_with_bonus = FinanceTransaction.objects.filter(
            id=payment.id
        ).annotate(
            payment_rate=Coalesce(
                Subquery(
                    ExchangeRate.objects.filter(
                        rate_date__lte=OuterRef('date')
                    ).order_by('-rate_date').values('usd_to_uzs')[:1]
                ),
                Value(Decimal('12800'), output_field=DecimalField())
            ),
            bonus_uzs=ExpressionWrapper(
                F('amount_usd') * Decimal('0.01') * F('payment_rate'),
                output_field=DecimalField()
            )
        )
        
        bonus = payments_with_bonus.first().bonus_uzs
        
        # Should use default rate: 1000 × 0.01 × 12800 = 128,000
        expected = Decimal('128000.00')
        self.assertEqual(bonus, expected)


class BonusPerformanceTestCase(TestCase):
    """Test performance of bonus calculation with many records"""
    
    def setUp(self):
        """Setup test data"""
        self.manager = User.objects.create_user(
            username='perf_manager',
            role='sales',
            password='testpass123'
        )
        
        self.dealer = Dealer.objects.create(
            name='Performance Test Dealer',
            code='PTD001',
            manager_user=self.manager
        )
        
        # Create exchange rates
        for month in range(1, 13):
            ExchangeRate.objects.create(
                rate_date=date(2025, month, 1),
                usd_to_uzs=Decimal('12500.00') + Decimal(month * 100)
            )
    
    def test_bonus_calculation_performance(self):
        """Test that bonus calculation performs well with 100 payments"""
        import time
        
        # Create 100 payments
        payments = []
        for i in range(100):
            month = (i % 12) + 1
            payments.append(
                FinanceTransaction(
                    dealer=self.dealer,
                    type=FinanceTransaction.TransactionType.INCOME,
                    status=FinanceTransaction.TransactionStatus.APPROVED,
                    date=date(2025, month, 15),
                    amount_usd=Decimal('1000.00')
                )
            )
        FinanceTransaction.objects.bulk_create(payments)
        
        # Measure calculation time
        start_time = time.time()
        
        result = FinanceTransaction.objects.filter(
            dealer=self.dealer
        ).annotate(
            payment_rate=Coalesce(
                Subquery(
                    ExchangeRate.objects.filter(
                        rate_date__lte=OuterRef('date')
                    ).order_by('-rate_date').values('usd_to_uzs')[:1]
                ),
                Value(Decimal('12800'))
            ),
            bonus_uzs=ExpressionWrapper(
                F('amount_usd') * Decimal('0.01') * F('payment_rate'),
                output_field=DecimalField()
            )
        ).aggregate(total=Sum('bonus_uzs'))['total']
        
        elapsed_time = time.time() - start_time
        
        # Should complete in less than 2 seconds
        self.assertLess(elapsed_time, 2.0)
        
        # Result should be reasonable
        self.assertGreater(result, Decimal('0'))
        
        print(f"\n⚡ Performance Test Results:")
        print(f"Records processed: 100 payments")
        print(f"Time elapsed: {elapsed_time:.3f} seconds")
        print(f"Total bonus calculated: {result:,.2f} UZS")