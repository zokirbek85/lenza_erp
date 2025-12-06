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
    
    template_name = None  # Using inline template
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
            'region': getattr(dealer, 'region', {}).get('name', '') if hasattr(dealer, 'region') else '',
        }
        
        # Add base CSS
        context['base_css'] = self.get_base_css()
        
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
            'created_by': getattr(self.return_document.created_by, 'get_full_name', lambda: '')() if self.return_document.created_by else '',
        })
        
        return context
    
    def render_html(self, context: Optional[Dict[str, Any]] = None) -> str:
        """Render document to HTML string using inline template."""
        from django.template import Template, Context
        
        full_context = self.get_context()
        if context:
            full_context.update(context)
        
        template = Template(self._get_template_html())
        return template.render(Context(full_context))
    
    def _get_template_html(self) -> str:
        """Get inline HTML template."""
        return ReturnInvoiceTemplate.get_html()


class ReturnInvoiceTemplate:
    """HTML template for return invoice."""
    
    @staticmethod
    def get_html() -> str:
        return '''
{% load tz i18n %}
<!DOCTYPE html>
<html lang="{{ language|default:'uz' }}">
<head>
    <meta charset="utf-8" />
    <style>
        {{ base_css }}
        
        /* Return invoice specific styles */
        .return-header {
            text-align: right;
        }
        
        .return-number {
            font-size: {{ style.FONT_SIZE_XLARGE }};
            font-weight: 700;
            color: {{ style.ERROR }};
        }
        
        .return-title {
            font-size: {{ style.FONT_SIZE_LARGE }};
            font-weight: 700;
            color: {{ style.PRIMARY }};
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: {{ style.FONT_SIZE_SMALL }};
            font-weight: 600;
            margin-top: 8px;
        }
        
        .status-healthy {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-defect {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .exchange-rate-box {
            margin-top: 16px;
            padding: 12px 16px;
            background: #eff6ff;
            border-radius: {{ style.BORDER_RADIUS }};
            border-left: 4px solid {{ style.ACCENT }};
        }
        
        .exchange-rate-label {
            font-size: {{ style.FONT_SIZE_SMALL }};
            color: {{ style.TEXT_MUTED }};
            margin-bottom: 4px;
        }
        
        .exchange-rate-value {
            font-size: 16px;
            font-weight: 700;
            color: {{ style.PRIMARY }};
        }
        
        .notes-box {
            margin-top: 24px;
            padding: 14px 18px;
            background: #fef3c7;
            border-radius: {{ style.BORDER_RADIUS }};
            border-left: 4px solid {{ style.WARNING }};
        }
        
        .notes-label {
            font-size: {{ style.FONT_SIZE_SMALL }};
            font-weight: 600;
            color: {{ style.TEXT_MUTED }};
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
        }
        
        .notes-content {
            font-size: {{ style.FONT_SIZE_BASE }};
            color: {{ style.PRIMARY }};
            line-height: 1.6;
        }
    </style>
</head>
<body>
    {% if add_watermark %}
    <div class="watermark">{{ watermark_text }}</div>
    {% endif %}
    
    <main class="document">
        <!-- Header -->
        <header class="document-header">
            <div class="company-info">
                {% if company.logo %}
                <img src="{{ company.logo }}" alt="{{ company.name }}" class="logo-img" />
                {% endif %}
                <div class="brand">{{ company.name }}</div>
                <div class="tagline">{{ company.tagline }}</div>
            </div>
            <div class="return-header">
                <div class="return-title">{% trans "Return Document" %}</div>
                <div class="return-number">#{{ document_number }}</div>
                <div class="text-muted" style="margin-top: 8px;">
                    {{ document_date|date:"d.m.Y" }}
                </div>
            </div>
        </header>
        
        <!-- Info Cards -->
        <div class="info-cards">
            <div class="info-card">
                <span class="info-card-label">{% trans "Dealer" %}</span>
                <strong class="info-card-value">{{ dealer.name }}</strong>
                {% if dealer.code %}
                <div class="text-muted" style="margin-top: 4px;">
                    {{ dealer.code }}
                </div>
                {% endif %}
            </div>
            
            {% if dealer.region %}
            <div class="info-card">
                <span class="info-card-label">{% trans "Region" %}</span>
                <strong class="info-card-value">{{ dealer.region }}</strong>
            </div>
            {% endif %}
            
            {% if dealer.phone %}
            <div class="info-card">
                <span class="info-card-label">{% trans "Contact" %}</span>
                <strong class="info-card-value">{{ dealer.phone }}</strong>
            </div>
            {% endif %}
            
            {% if created_by %}
            <div class="info-card">
                <span class="info-card-label">{% trans "Manager" %}</span>
                <strong class="info-card-value">{{ created_by }}</strong>
            </div>
            {% endif %}
        </div>
        
        <!-- Items Table -->
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">№</th>
                    <th>{% trans "Product" %}</th>
                    <th style="width: 120px;">{% trans "Size" %}</th>
                    <th class="text-center" style="width: 100px;">{% trans "Status" %}</th>
                    <th class="text-right" style="width: 80px;">{% trans "Quantity" %}</th>
                    <th class="text-right" style="width: 100px;">{% trans "Price (USD)" %}</th>
                    <th class="text-right" style="width: 120px;">{% trans "Total (USD)" %}</th>
                </tr>
            </thead>
            <tbody>
                {% for item in items %}
                <tr>
                    <td class="text-center">{{ item.number }}</td>
                    <td><strong>{{ item.product }}</strong></td>
                    <td>{{ item.size|default:"—" }}</td>
                    <td class="text-center">
                        <span class="status-badge status-{{ item.status_code }}">
                            {{ item.status }}
                        </span>
                    </td>
                    <td class="text-right">{{ item.qty }}</td>
                    <td class="text-right">{{ item.price_usd }}</td>
                    <td class="text-right font-bold">{{ item.total_usd }}</td>
                </tr>
                {% if item.comment %}
                <tr>
                    <td colspan="7" style="padding-top: 0; font-size: 11px; color: {{ style.TEXT_MUTED }};">
                        {% trans "Note" %}: {{ item.comment }}
                    </td>
                </tr>
                {% endif %}
                {% endfor %}
            </tbody>
        </table>
        
        <!-- Exchange Rate Info -->
        <div class="exchange-rate-box">
            <div class="exchange-rate-label">
                {% trans "Exchange Rate" %} ({{ totals.exchange_rate.date|date:"d.m.Y" }})
            </div>
            <div class="exchange-rate-value">
                1 USD = {{ totals.exchange_rate.formatted }} UZS
            </div>
        </div>
        
        <!-- Totals -->
        <div style="margin-top: 24px;">
            <table class="totals-table">
                <tr>
                    <td>{% trans "Return Total (USD)" %}:</td>
                    <td class="text-right">{{ totals.total_usd_formatted }}</td>
                </tr>
                <tr>
                    <td>{% trans "Return Total (UZS)" %}:</td>
                    <td class="text-right">{{ totals.total_uzs_formatted }}</td>
                </tr>
            </table>
        </div>
        
        <!-- General Comment -->
        {% if general_comment %}
        <div class="notes-box">
            <div class="notes-label">{% trans "General Comment" %}</div>
            <div class="notes-content">{{ general_comment }}</div>
        </div>
        {% endif %}
        
        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">
                    {% trans "Manager" %}
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    {% trans "Approved by" %}
                </div>
            </div>
        </div>
        
        <!-- Footer with QR -->
        <footer class="document-footer">
            <div>
                <div class="footer-text">
                    {{ company.name }} | {{ company.phone }} | {{ company.email }}
                </div>
                <div class="footer-date" style="margin-top: 4px;">
                    {% trans "Generated automatically by Lenza ERP" %} | {{ today|date:"d.m.Y" }}
                </div>
            </div>
            {% if qr_code %}
            <div class="qr-box">
                <img src="{{ qr_code }}" alt="QR Code" class="qr-img" />
                <div style="margin-top: 4px;">{% trans "Scan to verify" %}</div>
            </div>
            {% endif %}
        </footer>
    </main>
</body>
</html>
        '''
