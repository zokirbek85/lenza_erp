"""
Invoice Document Generator.

Generates professional invoices for orders with:
- Order details
- Dealer information
- Product table
- Exchange rate
- Totals in USD/UZS
- QR code for verification
"""

from decimal import Decimal
from typing import Any, Dict, Optional
from django.http import HttpRequest

from .base import BaseDocument, DocumentStyle


class InvoiceDocument(BaseDocument):
    """
    Professional invoice document generator.
    
    Usage:
        order = Order.objects.get(pk=1)
        invoice = InvoiceDocument(order=order, request=request)
        return invoice.get_response(filename=f'invoice_{order.display_no}.pdf')
    """
    
    template_name = 'documents/invoice.html'
    document_type = 'invoice'
    
    def __init__(
        self,
        *,
        order,
        request: Optional[HttpRequest] = None,
        show_qr: bool = True,
        **kwargs
    ):
        """
        Initialize invoice document.
        
        Args:
            order: Order instance
            request: HTTP request (for QR code URL)
            show_qr: Whether to show QR code
            **kwargs: Additional args for BaseDocument
        """
        super().__init__(**kwargs)
        self.order = order
        self.request = request
        self.show_qr = show_qr
    
    def get_qr_url(self) -> Optional[str]:
        """Get QR code verification URL."""
        if not self.request or not self.show_qr:
            return None
        
        # Build absolute URL for invoice verification
        base_url = self.request.build_absolute_uri('/').rstrip('/')
        return f"{base_url}/api/orders/{self.order.pk}/invoice/"
    
    def get_exchange_rate_info(self) -> Dict[str, Any]:
        """Get exchange rate information."""
        from core.utils.currency import get_exchange_rate
        
        # Use order's stored rate if available, otherwise get current
        if self.order.exchange_rate:
            rate = self.order.exchange_rate
            rate_date = self.order.exchange_rate_date or self.order.value_date
        else:
            rate, rate_date = get_exchange_rate(self.order.value_date)
        
        return {
            'rate': rate,
            'date': rate_date,
            'formatted': self.format_currency(rate, 'UZS', show_currency=False),
        }
    
    def get_items_data(self) -> list:
        """Get formatted items data."""
        items = []
        for item in self.order.items.all():
            qty = item.qty
            price_usd = item.price_usd
            total_usd = qty * price_usd
            
            items.append({
                'product': item.product_detail.name if item.product_detail else f'Product #{item.product}',
                'qty': self.format_quantity(qty),
                'price_usd': self.format_currency(price_usd, 'USD'),
                'total_usd': self.format_currency(total_usd, 'USD'),
                'raw_total': total_usd,
            })
        
        return items
    
    def get_totals(self) -> Dict[str, Any]:
        """Get invoice totals."""
        rate_info = self.get_exchange_rate_info()
        
        total_usd = self.order.total_usd or Decimal('0')
        total_uzs = total_usd * rate_info['rate']
        
        return {
            'total_usd': total_usd,
            'total_uzs': total_uzs,
            'total_usd_formatted': self.format_currency(total_usd, 'USD'),
            'total_uzs_formatted': self.format_currency(total_uzs, 'UZS'),
            'exchange_rate': rate_info,
        }
    
    def get_context(self) -> Dict[str, Any]:
        """Get template context for invoice."""
        context = super().get_context()
        
        qr_url = self.get_qr_url()
        qr_code = self.generate_qr_code(qr_url) if qr_url else None
        
        context.update({
            'order': self.order,
            'dealer': self.order.dealer,
            'items': self.get_items_data(),
            'totals': self.get_totals(),
            'qr_code': qr_code,
            'qr_url': qr_url,
            'document_number': self.order.display_no,
            'document_date': self.order.value_date,
            'status': self.order.get_status_display(),
            'is_reserve': self.order.is_reserve,
        })
        
        return context


class InvoiceTemplate:
    """HTML template for invoice."""
    
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
        
        /* Invoice specific styles */
        .invoice-meta {
            text-align: right;
        }
        
        .invoice-number {
            font-size: {{ style.FONT_SIZE_XLARGE }};
            font-weight: 700;
            color: {{ style.ACCENT }};
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: {{ style.FONT_SIZE_SMALL }};
            font-weight: 600;
            margin-top: 8px;
        }
        
        .reserve-badge {
            background: #fef3c7;
            color: #92400e;
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
            <div class="invoice-meta">
                <span class="meta-label">{% trans "Invoice" %}</span>
                <div class="invoice-number">#{{ document_number }}</div>
                <div class="text-muted" style="margin-top: 8px;">
                    {{ document_date|date:"d.m.Y" }}
                </div>
                {% if is_reserve %}
                <span class="status-badge reserve-badge">
                    {% trans "Reserve" %}
                </span>
                {% endif %}
            </div>
        </header>
        
        <!-- Info Cards -->
        <div class="info-cards">
            <div class="info-card">
                <span class="info-card-label">{% trans "Dealer" %}</span>
                <strong class="info-card-value">{{ dealer.name }}</strong>
                <div class="text-muted" style="margin-top: 4px;">
                    {{ dealer.code }}
                </div>
            </div>
            
            <div class="info-card">
                <span class="info-card-label">{% trans "Status" %}</span>
                <strong class="info-card-value">{{ status }}</strong>
            </div>
            
            {% if dealer.phone %}
            <div class="info-card">
                <span class="info-card-label">{% trans "Contact" %}</span>
                <strong class="info-card-value">{{ dealer.phone }}</strong>
            </div>
            {% endif %}
        </div>
        
        <!-- Items Table -->
        <table>
            <thead>
                <tr>
                    <th>№</th>
                    <th>{% trans "Product" %}</th>
                    <th class="text-right">{% trans "Quantity" %}</th>
                    <th class="text-right">{% trans "Price (USD)" %}</th>
                    <th class="text-right">{% trans "Total (USD)" %}</th>
                </tr>
            </thead>
            <tbody>
                {% for item in items %}
                <tr>
                    <td>{{ forloop.counter }}</td>
                    <td><strong>{{ item.product }}</strong></td>
                    <td class="text-right">{{ item.qty }}</td>
                    <td class="text-right">{{ item.price_usd }}</td>
                    <td class="text-right font-bold">{{ item.total_usd }}</td>
                </tr>
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
                    <td>{% trans "Total (USD)" %}:</td>
                    <td class="text-right">{{ totals.total_usd_formatted }}</td>
                </tr>
                <tr>
                    <td>{% trans "Total (UZS)" %}:</td>
                    <td class="text-right">{{ totals.total_uzs_formatted }}</td>
                </tr>
            </table>
        </div>
        
        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">
                    {% trans "Prepared by" %}
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
                    {{ today|date:"d.m.Y" }}
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
