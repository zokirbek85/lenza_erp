"""
Tests for currency utility functions.
"""
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from finance.models import ExchangeRate
from core.utils.currency import (
    get_exchange_rate,
    usd_to_uzs,
    uzs_to_usd,
    convert_currency
)


class CurrencyUtilityTests(TestCase):
    """Test currency utility functions."""
    
    def setUp(self):
        """Create test exchange rates."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)
        
        # Create test rates
        self.rate_today = ExchangeRate.objects.create(
            rate_date=today,
            usd_to_uzs=Decimal('12800')
        )
        self.rate_yesterday = ExchangeRate.objects.create(
            rate_date=yesterday,
            usd_to_uzs=Decimal('12750')
        )
        self.rate_old = ExchangeRate.objects.create(
            rate_date=two_days_ago,
            usd_to_uzs=Decimal('12600')
        )
    
    def test_get_exchange_rate_exact_date(self):
        """Test getting exchange rate for exact date."""
        rate, rate_date = get_exchange_rate(self.rate_today.rate_date)
        
        self.assertEqual(rate, Decimal('12800'))
        self.assertEqual(rate_date, self.rate_today.rate_date)
    
    def test_get_exchange_rate_past_date(self):
        """Test getting exchange rate for past date (should use most recent before date)."""
        tomorrow = date.today() + timedelta(days=1)
        rate, rate_date = get_exchange_rate(tomorrow)
        
        # Should get today's rate (most recent before tomorrow)
        self.assertEqual(rate, Decimal('12800'))
        self.assertEqual(rate_date, self.rate_today.rate_date)
    
    def test_get_exchange_rate_no_date(self):
        """Test getting exchange rate without date (should use most recent)."""
        rate, rate_date = get_exchange_rate()
        
        # Should get most recent rate
        self.assertEqual(rate, Decimal('12800'))
        self.assertEqual(rate_date, self.rate_today.rate_date)
    
    def test_get_exchange_rate_fallback(self):
        """Test fallback rate when no rates exist."""
        # Delete all rates
        ExchangeRate.objects.all().delete()
        
        rate, rate_date = get_exchange_rate()
        
        # Should return fallback
        self.assertEqual(rate, Decimal('12700'))
        self.assertIsNotNone(rate_date)
    
    def test_usd_to_uzs_conversion(self):
        """Test USD to UZS conversion."""
        amount_usd = Decimal('100.00')
        amount_uzs, rate = usd_to_uzs(amount_usd, self.rate_today.rate_date)
        
        expected_uzs = Decimal('1280000.00')
        self.assertEqual(amount_uzs, expected_uzs)
        self.assertEqual(rate, Decimal('12800'))
    
    def test_usd_to_uzs_zero(self):
        """Test USD to UZS with zero amount."""
        amount_uzs, rate = usd_to_uzs(Decimal('0'), self.rate_today.rate_date)
        
        self.assertEqual(amount_uzs, Decimal('0.00'))
        self.assertEqual(rate, Decimal('12800'))
    
    def test_uzs_to_usd_conversion(self):
        """Test UZS to USD conversion."""
        amount_uzs = Decimal('1280000.00')
        amount_usd, rate = uzs_to_usd(amount_uzs, self.rate_today.rate_date)
        
        expected_usd = Decimal('100.00')
        self.assertEqual(amount_usd, expected_usd)
        self.assertEqual(rate, Decimal('12800'))
    
    def test_uzs_to_usd_zero(self):
        """Test UZS to USD with zero amount."""
        amount_usd, rate = uzs_to_usd(Decimal('0'), self.rate_today.rate_date)
        
        self.assertEqual(amount_usd, Decimal('0.00'))
        self.assertEqual(rate, Decimal('12800'))
    
    def test_convert_currency_usd_to_uzs(self):
        """Test generic currency converter USD to UZS."""
        amount = Decimal('100.00')
        converted, rate = convert_currency(
            amount, 'USD', 'UZS', self.rate_today.rate_date
        )
        
        expected = Decimal('1280000.00')
        self.assertEqual(converted, expected)
        self.assertEqual(rate, Decimal('12800.00'))
    
    def test_convert_currency_uzs_to_usd(self):
        """Test generic currency converter UZS to USD."""
        amount = Decimal('1280000.00')
        converted, rate = convert_currency(
            amount, 'UZS', 'USD', self.rate_today.rate_date
        )
        
        expected = Decimal('100.00')
        self.assertEqual(converted, expected)
        self.assertEqual(rate, Decimal('12800.00'))
    
    def test_convert_currency_same_currency(self):
        """Test conversion with same source and target currency."""
        amount = Decimal('100.00')
        converted, rate = convert_currency(amount, 'USD', 'USD')
        
        self.assertEqual(converted, amount)
        self.assertIsNone(rate)
    
    def test_convert_currency_unsupported(self):
        """Test conversion with unsupported currency."""
        with self.assertRaises(ValueError):
            convert_currency(Decimal('100'), 'EUR', 'USD')
    
    def test_rate_selection_logic(self):
        """Test that correct rate is selected for different dates."""
        # Rate 2 days ago
        rate, _ = get_exchange_rate(self.rate_old.rate_date)
        self.assertEqual(rate, Decimal('12600'))
        
        # Rate yesterday
        rate, _ = get_exchange_rate(self.rate_yesterday.rate_date)
        self.assertEqual(rate, Decimal('12750'))
        
        # Rate today
        rate, _ = get_exchange_rate(self.rate_today.rate_date)
        self.assertEqual(rate, Decimal('12800'))
    
    def test_precision_handling(self):
        """Test decimal precision in conversions."""
        # Test with precise decimal values
        amount_usd = Decimal('123.45')
        amount_uzs, _ = usd_to_uzs(amount_usd, self.rate_today.rate_date)
        
        # 123.45 * 12800 = 1580160
        expected_uzs = Decimal('1580160.00')
        self.assertEqual(amount_uzs, expected_uzs)
        
        # Convert back
        amount_usd_back, _ = uzs_to_usd(amount_uzs, self.rate_today.rate_date)
        self.assertEqual(amount_usd_back, amount_usd)
