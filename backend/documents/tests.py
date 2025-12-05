"""
Tests for PDF document system.
"""
from decimal import Decimal
from datetime import date
from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth import get_user_model

from documents import InvoiceDocument, ReconciliationDocument, BaseDocument
from orders.models import Order
from dealers.models import Dealer

User = get_user_model()


class BaseDocumentTests(TestCase):
    """Test BaseDocument functionality."""
    
    def setUp(self):
        self.doc = BaseDocument(language='uz')
    
    def test_format_currency_usd(self):
        """Test USD currency formatting."""
        result = self.doc.format_currency(Decimal('1234.56'), 'USD')
        self.assertEqual(result, '$1,234.56')
    
    def test_format_currency_uzs(self):
        """Test UZS currency formatting."""
        result = self.doc.format_currency(Decimal('1234567'), 'UZS')
        self.assertEqual(result, '1,234,567 so\'m')
    
    def test_format_date(self):
        """Test date formatting."""
        test_date = date(2025, 12, 5)
        result = self.doc.format_date(test_date)
        self.assertEqual(result, '05.12.2025')
    
    def test_format_quantity(self):
        """Test quantity formatting."""
        self.assertEqual(self.doc.format_quantity(Decimal('10.00')), '10')
        self.assertEqual(self.doc.format_quantity(Decimal('10.50')), '10.5')
        self.assertEqual(self.doc.format_quantity(Decimal('10.25')), '10.25')
    
    def test_generate_qr_code(self):
        """Test QR code generation."""
        qr = self.doc.generate_qr_code('https://example.com')
        self.assertTrue(qr.startswith('data:image/png;base64,'))
    
    def test_get_base_css(self):
        """Test base CSS generation."""
        css = self.doc.get_base_css()
        self.assertIn('@page', css)
        self.assertIn('font-family', css)
        self.assertIn('table', css)
    
    def test_watermark(self):
        """Test watermark support."""
        doc_with_watermark = BaseDocument(add_watermark=True, watermark_text='TEST')
        context = doc_with_watermark.get_context()
        self.assertTrue(context['add_watermark'])
        self.assertEqual(context['watermark_text'], 'TEST')


class InvoiceDocumentTests(TestCase):
    """Test InvoiceDocument functionality."""
    
    def setUp(self):
        # Create test data
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.dealer = Dealer.objects.create(
            code='D001',
            name='Test Dealer',
            phone='+998901234567',
        )
        
        self.order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            value_date=date.today(),
            status='approved',
            total_usd=Decimal('100.00'),
            exchange_rate=Decimal('12800'),
            exchange_rate_date=date.today(),
        )
        
        self.factory = RequestFactory()
    
    def test_invoice_initialization(self):
        """Test invoice document initialization."""
        invoice = InvoiceDocument(order=self.order, language='uz')
        self.assertEqual(invoice.order, self.order)
        self.assertEqual(invoice.document_type, 'invoice')
    
    def test_get_exchange_rate_info(self):
        """Test exchange rate information retrieval."""
        invoice = InvoiceDocument(order=self.order)
        rate_info = invoice.get_exchange_rate_info()
        
        self.assertEqual(rate_info['rate'], Decimal('12800'))
        self.assertIn('date', rate_info)
        self.assertIn('formatted', rate_info)
    
    def test_get_totals(self):
        """Test invoice totals calculation."""
        invoice = InvoiceDocument(order=self.order)
        totals = invoice.get_totals()
        
        self.assertEqual(totals['total_usd'], Decimal('100.00'))
        self.assertEqual(totals['total_uzs'], Decimal('1280000.00'))
        self.assertIn('exchange_rate', totals)
    
    def test_get_context(self):
        """Test invoice context generation."""
        request = self.factory.get('/api/orders/1/invoice/')
        invoice = InvoiceDocument(order=self.order, request=request, show_qr=True)
        context = invoice.get_context()
        
        self.assertIn('order', context)
        self.assertIn('dealer', context)
        self.assertIn('items', context)
        self.assertIn('totals', context)
        self.assertIn('document_number', context)
        self.assertEqual(context['document_number'], self.order.display_no)
    
    @override_settings(ALLOWED_HOSTS=['*'])
    def test_qr_code_generation(self):
        """Test QR code generation for invoice."""
        request = self.factory.get('/api/orders/1/invoice/')
        request.META['HTTP_HOST'] = 'example.com'
        
        invoice = InvoiceDocument(order=self.order, request=request, show_qr=True)
        qr_url = invoice.get_qr_url()
        
        self.assertIsNotNone(qr_url)
        self.assertIn('/api/orders/', qr_url)
    
    def test_render_html(self):
        """Test HTML rendering."""
        invoice = InvoiceDocument(order=self.order)
        html = invoice.render_html()
        
        self.assertIn('<!DOCTYPE html>', html)
        self.assertIn(self.order.display_no, html)
        self.assertIn(self.dealer.name, html)
    
    def test_render_pdf(self):
        """Test PDF rendering."""
        invoice = InvoiceDocument(order=self.order)
        pdf_bytes = invoice.render_pdf()
        
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))
    
    def test_get_response(self):
        """Test HTTP response generation."""
        invoice = InvoiceDocument(order=self.order)
        response = invoice.get_response(filename='test.pdf', inline=True)
        
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('inline', response['Content-Disposition'])
        self.assertIn('test.pdf', response['Content-Disposition'])


class ReconciliationDocumentTests(TestCase):
    """Test ReconciliationDocument functionality."""
    
    def setUp(self):
        self.sample_data = {
            'dealer': 'Test Dealer',
            'from_date': date(2025, 1, 1),
            'to_date': date(2025, 12, 31),
            'opening_balance': 0,
            'closing_balance': 400,
            'totals': {
                'orders': 1000,
                'returns': 100,
                'payments': 500,
            },
            'orders': [
                {'date': date(2025, 6, 1), 'order_no': 'ORD-001', 'amount_usd': 1000}
            ],
            'returns': [
                {'date': date(2025, 6, 15), 'order_no': 'ORD-001', 'amount_usd': 100}
            ],
            'payments': [
                {'date': date(2025, 7, 1), 'account_name': 'Cash', 'amount_usd': 500}
            ],
        }
    
    def test_reconciliation_initialization(self):
        """Test reconciliation document initialization."""
        recon = ReconciliationDocument(data=self.sample_data)
        self.assertEqual(recon.document_type, 'reconciliation')
        self.assertTrue(recon.show_detailed)
    
    def test_get_summary_data(self):
        """Test summary data extraction."""
        recon = ReconciliationDocument(data=self.sample_data)
        summary = recon.get_summary_data()
        
        self.assertEqual(summary['opening_balance'], Decimal('0'))
        self.assertEqual(summary['total_orders'], Decimal('1000'))
        self.assertEqual(summary['total_returns'], Decimal('100'))
        self.assertEqual(summary['total_payments'], Decimal('500'))
        self.assertEqual(summary['closing_balance'], Decimal('400'))
    
    def test_build_transaction_list(self):
        """Test transaction list building with running balance."""
        recon = ReconciliationDocument(data=self.sample_data)
        transactions = recon._build_transaction_list()
        
        # Should have: opening + 1 order + 1 return + 1 payment = 4 transactions
        self.assertEqual(len(transactions), 4)
        
        # First should be opening balance
        self.assertEqual(transactions[0]['type'], 'opening')
        
        # Check running balance
        opening_trans = transactions[0]
        self.assertEqual(opening_trans['balance'], Decimal('0'))
        
        # After order: 0 + 1000 = 1000
        order_trans = [t for t in transactions if t['type'] == 'order'][0]
        self.assertEqual(order_trans['balance'], Decimal('1000'))
    
    def test_get_context(self):
        """Test reconciliation context generation."""
        recon = ReconciliationDocument(data=self.sample_data, show_detailed=True)
        context = recon.get_context()
        
        self.assertIn('dealer', context)
        self.assertIn('from_date', context)
        self.assertIn('to_date', context)
        self.assertIn('transactions', context)
        self.assertIn('summary', context)
        self.assertTrue(context['show_detailed'])
    
    def test_render_html(self):
        """Test HTML rendering."""
        recon = ReconciliationDocument(data=self.sample_data)
        html = recon.render_html()
        
        self.assertIn('<!DOCTYPE html>', html)
        self.assertIn('Test Dealer', html)
        self.assertIn('Reconciliation Statement', html)
    
    def test_render_pdf(self):
        """Test PDF rendering."""
        recon = ReconciliationDocument(data=self.sample_data)
        pdf_bytes = recon.render_pdf()
        
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))


class DocumentIntegrationTests(TestCase):
    """Integration tests for document system."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.dealer = Dealer.objects.create(
            code='D001',
            name='Integration Test Dealer',
        )
    
    def test_invoice_with_multiple_languages(self):
        """Test invoice generation in multiple languages."""
        order = Order.objects.create(
            dealer=self.dealer,
            created_by=self.user,
            value_date=date.today(),
            total_usd=Decimal('100.00'),
        )
        
        for lang in ['uz', 'ru', 'en']:
            invoice = InvoiceDocument(order=order, language=lang)
            html = invoice.render_html()
            self.assertIn('<!DOCTYPE html>', html)
    
    def test_reconciliation_with_no_transactions(self):
        """Test reconciliation with empty transaction list."""
        data = {
            'dealer': 'Test Dealer',
            'from_date': date(2025, 1, 1),
            'to_date': date(2025, 12, 31),
            'opening_balance': 100,
            'closing_balance': 100,
            'totals': {'orders': 0, 'returns': 0, 'payments': 0},
            'orders': [],
            'returns': [],
            'payments': [],
        }
        
        recon = ReconciliationDocument(data=data)
        transactions = recon._build_transaction_list()
        
        # Should only have opening balance
        self.assertEqual(len(transactions), 1)
        self.assertEqual(transactions[0]['type'], 'opening')
    
    def test_document_style_consistency(self):
        """Test that all documents use consistent styling."""
        from documents.base import DocumentStyle
        
        # Test color constants are defined
        self.assertIsNotNone(DocumentStyle.PRIMARY)
        self.assertIsNotNone(DocumentStyle.ACCENT)
        
        # Test font constants
        self.assertIsNotNone(DocumentStyle.FONT_FAMILY)
        self.assertIsNotNone(DocumentStyle.FONT_SIZE_BASE)
        
        # Test spacing constants
        self.assertIsNotNone(DocumentStyle.PAGE_MARGIN)
