"""
Return Document Invoice Generator.

Generates professional return document PDFs similar to order invoices with:
- Return details
- Dealer information
- Returned items table
- Return totals (USD/UZS)
- QR code for verification
"""

from decimal import Decimal
from typing import Any, Dict, Optional
from django.http import HttpRequest, HttpResponse

from .base import BaseDocument, DocumentStyle


class ReturnInvoiceDocument(BaseDocument):
    """
    Professional return document generator.
    
    Usage:
        return_doc = Return.objects.get(pk=1)
        invoice = ReturnInvoiceDocument(return_document=return_doc, request=request)
        return invoice.get_response(filename=f'return_{return_doc.id}.pdf')
    """
    
    template_name = 'documents/return_invoice.html'
    document_type = 'return'
    
    def __init__(
        self,
        *,
        return_document,
        request: Optional[HttpRequest] = None,
        show_qr: bool = True,
        **kwargs
    ):
        """
        Initialize return invoice document.
        
        Args:
            return_document: Return instance
            request: HTTP request (for QR code URL)
            show_qr: Whether to show QR code
            **kwargs: Additional args for BaseDocument
        """
        super().__init__(**kwargs)
        self.return_document = return_document
        self.request = request
        self.show_qr = show_qr
    
    def get_qr_url(self) -> Optional[str]:
        """Get QR code verification URL."""
        if not self.request or not self.show_qr:
            return None
        
        # Build absolute URL for return verification
        base_url = self.request.build_absolute_uri('/').rstrip('/')
        return f"{base_url}/api/returns/{self.return_document.pk}/export-pdf/"
    
    def get_exchange_rate_info(self) -> Dict[str, Any]:
        """Get exchange rate information for the return date."""
        from core.utils.currency import get_exchange_rate
        
        # Use return creation date for exchange rate
        rate, rate_date = get_exchange_rate(self.return_document.created_at.date())
        
        return {
            'rate': rate,
            'date': rate_date,
            'formatted': self.format_currency(rate, 'UZS', show_currency=False),
        }
    
    def get_items_data(self) -> list:
        """Get formatted items data."""
        items = []
        for idx, item in enumerate(self.return_document.items.select_related('product').all(), start=1):
            product = item.product
            qty = item.quantity
            
            # Get product price (use sell_price_usd if available)
            price_usd = getattr(product, 'sell_price_usd', None) or Decimal('0.00')
            total_usd = qty * price_usd
            
            # Product size/category info
            size_info = ''
            if hasattr(product, 'category') and product.category:
                size_info = product.category.name
            
            items.append({
                'number': idx,
                'product': product.name,
                'size': size_info,
                'qty': self.format_quantity(qty),
                'status': item.get_status_display(),
                'status_code': item.status,
                'price_usd': self.format_currency(price_usd, 'USD') if price_usd > 0 else '—',
                'total_usd': self.format_currency(total_usd, 'USD') if price_usd > 0 else '—',
                'raw_total': total_usd,
                'comment': item.comment or '',
            })
        
        return items
    
    def get_totals(self) -> Dict[str, Any]:
        """Get return totals."""
        rate_info = self.get_exchange_rate_info()
        
        total_usd = self.return_document.total_sum or Decimal('0.00')
        total_uzs = total_usd * rate_info['rate']
        
        return {
            'total_usd': total_usd,
            'total_uzs': total_uzs,
            'total_usd_formatted': self.format_currency(total_usd, 'USD'),
            'total_uzs_formatted': self.format_currency(total_uzs, 'UZS'),
            'exchange_rate': rate_info,
        }
    
    def get_context(self) -> Dict[str, Any]:
        """Get template context for return invoice."""
        context = super().get_context()
        
        qr_url = self.get_qr_url()
        qr_code = self.generate_qr_code(qr_url) if qr_url else None
        
        dealer = self.return_document.dealer
        dealer_info = {
            'name': dealer.name,
            'code': getattr(dealer, 'code', ''),
            'phone': getattr(dealer, 'phone', ''),
            'region': dealer.region.name if dealer.region else '',
        }
        
        # Add base CSS
        context['base_css'] = self.get_base_css()
        
        # Get created by user name
        created_by_name = ''
        if self.return_document.created_by:
            try:
                created_by_name = self.return_document.created_by.get_full_name() or self.return_document.created_by.username
            except AttributeError:
                created_by_name = str(self.return_document.created_by)
        
        context.update({
            'return_document': self.return_document,
            'dealer': dealer_info,
            'items': self.get_items_data(),
            'totals': self.get_totals(),
            'qr_code': qr_code,
            'qr_url': qr_url,
            'document_number': f'RETURN-{self.return_document.id}',
            'document_date': self.return_document.created_at.date(),
            'general_comment': self.return_document.general_comment or '',
            'created_by': created_by_name,
        })
        
        return context
