# Professional PDF Document System

## Overview

Modulli, qayta ishlatish mumkin bo'lgan PDF hujjat generatsiya tizimi. Barcha PDF hujjatlar (invoice, reconciliation, reports) uchun yagona style guide va arxitektura.

## Features

✅ **Modulli arxitektura** - Har bir hujjat turi alohida class
✅ **Yagona style guide** - Professional, print-ready dizayn
✅ **Qayta ishlatish** - Base class bilan umumiy komponentlar
✅ **QR code support** - Hujjat verifikatsiya uchun
✅ **Watermark** - Optional "LENZA ERP" watermark
✅ **Multi-language** - uz, ru, en support
✅ **Exchange rate** - Dynamic currency conversion
✅ **Professional design** - Bosmaga tayyor

## Architecture

```
documents/
├── __init__.py          # Module exports
├── base.py              # BaseDocument - umumiy funksiyalar
├── invoice.py           # InvoiceDocument - buyurtma invoice
└── reconciliation.py    # ReconciliationDocument - akt sverka

templates/documents/
├── invoice.html         # Invoice template
└── reconciliation.html  # Reconciliation template
```

## Usage

### Invoice

```python
from documents import InvoiceDocument

# View ichida
def get(self, request, pk):
    order = Order.objects.get(pk=pk)
    
    invoice = InvoiceDocument(
        order=order,
        request=request,
        show_qr=True,
        language='uz',
    )
    
    filename = f'invoice_{order.display_no}.pdf'
    return invoice.get_response(filename=filename, inline=True)
```

### Reconciliation

```python
from documents import ReconciliationDocument

# View ichida
def get(self, request, pk):
    data = get_reconciliation_data(
        dealer_id=pk,
        from_date='2025-01-01',
        to_date='2025-12-31',
        user=request.user,
    )
    
    reconciliation = ReconciliationDocument(
        data=data,
        show_detailed=True,
        language='uz',
    )
    
    filename = 'reconciliation.pdf'
    return reconciliation.get_response(filename=filename, inline=True)
```

## Base Components

### DocumentStyle

Standard ranglar, fontlar, spacing:

```python
# Colors
PRIMARY = '#0f172a'
ACCENT = '#0d9488'
TEXT_MUTED = '#6b7280'
BORDER = '#e5e7eb'

# Typography
FONT_SIZE_BASE = '13px'
FONT_SIZE_SMALL = '11px'
FONT_SIZE_LARGE = '16px'

# Spacing
PAGE_MARGIN = '32px'
SECTION_SPACING = '28px'
```

### BaseDocument Methods

**get_context()** - Template context
**generate_qr_code()** - QR code yaratish
**get_header_html()** - Header HTML
**get_footer_html()** - Footer HTML
**render_html()** - HTML render
**render_pdf()** - PDF bytes
**get_response()** - HTTP response

**Static helpers:**
- `format_currency()` - Currency formatting
- `format_date()` - Date formatting
- `format_quantity()` - Quantity formatting

## Invoice Document

### Features

- Order ma'lumotlari (№, sana, status)
- Dealer ma'lumotlari (ism, kod, telefon)
- Mahsulotlar jadvali (qty, price, total)
- Exchange rate (kurs va sana)
- Totals (USD va UZS)
- QR code (invoice verification)
- Signature lines
- Professional header/footer

### Context

```python
{
    'order': order,
    'dealer': dealer,
    'items': [{'product': '...', 'qty': '...', 'price_usd': '...', 'total_usd': '...'}],
    'totals': {
        'total_usd': Decimal('100.00'),
        'total_uzs': Decimal('1280000.00'),
        'exchange_rate': {'rate': 12800, 'date': date.today()},
    },
    'qr_code': 'data:image/png;base64,...',
    'document_number': 'ORD-001',
    'document_date': date.today(),
    'status': 'Approved',
}
```

## Reconciliation Document

### Features

- Period (from/to dates)
- Dealer name
- Opening balance
- Transactions list:
  - Orders (debit)
  - Returns (credit)
  - Payments (credit)
- Running balance
- Summary totals
- Closing balance
- Color-coded rows
- Signature lines

### Context

```python
{
    'dealer': 'Dealer Name',
    'from_date': date(2025, 1, 1),
    'to_date': date(2025, 12, 31),
    'transactions': [
        {
            'date': date.today(),
            'type': 'opening',
            'description': 'Opening Balance',
            'debit': '$100.00',
            'credit': '—',
            'balance_formatted': '$100.00',
        },
        # ... more transactions
    ],
    'summary': {
        'opening_balance': Decimal('0'),
        'total_orders': Decimal('1000'),
        'total_returns': Decimal('100'),
        'total_payments': Decimal('500'),
        'closing_balance': Decimal('400'),
    },
}
```

## Customization

### Adding New Document Type

1. Create `documents/my_document.py`:

```python
from .base import BaseDocument

class MyDocument(BaseDocument):
    template_name = 'documents/my_document.html'
    document_type = 'my-document'
    
    def get_context(self):
        context = super().get_context()
        context.update({
            'my_data': self.my_data,
        })
        return context
```

2. Create `templates/documents/my_document.html`

3. Export in `documents/__init__.py`:

```python
from .my_document import MyDocument

__all__ = [..., 'MyDocument']
```

4. Use in view:

```python
from documents import MyDocument

doc = MyDocument(my_data=data)
return doc.get_response(filename='my_doc.pdf')
```

### Custom Styling

Override `get_base_css()` in subclass:

```python
class MyDocument(BaseDocument):
    def get_base_css(self):
        base_css = super().get_base_css()
        return base_css + '''
        .my-custom-class {
            color: red;
        }
        '''
```

## Configuration

### Watermark

```python
doc = InvoiceDocument(
    order=order,
    add_watermark=True,
    watermark_text='DRAFT',
)
```

### Language

```python
doc = InvoiceDocument(
    order=order,
    language='ru',  # uz, ru, en
)
```

### QR Code

```python
doc = InvoiceDocument(
    order=order,
    show_qr=True,
    request=request,  # Required for absolute URLs
)
```

## Testing

```bash
# Test invoice generation
curl http://localhost:8000/api/orders/1/invoice/ -o invoice.pdf

# Test reconciliation
curl http://localhost:8000/api/dealers/1/reconciliation/pdf/ -o recon.pdf
```

## Print Settings

- **Page size**: A4 (Invoice), A4 Landscape (Reconciliation)
- **Margins**: 32px (Invoice), 24px (Reconciliation)
- **Font**: DejaVu Sans (UTF-8 support)
- **Resolution**: 300 DPI equivalent
- **Format**: PDF 1.7

## Dependencies

- `weasyprint` - HTML to PDF conversion
- `qrcode` - QR code generation
- `pillow` - Image processing
- Django templates - HTML rendering

## Migration from Old System

### Before (Old system)

```python
class OrderInvoiceView(APIView, ExportMixin):
    def get(self, request, pk):
        context = {...}
        return self.render_pdf_with_qr(
            'orders/invoice.html',
            context,
            filename_prefix=order.display_no,
        )
```

### After (New system)

```python
class OrderInvoiceView(APIView):
    def get(self, request, pk):
        invoice = InvoiceDocument(order=order, request=request)
        return invoice.get_response(filename=f'invoice_{order.display_no}.pdf')
```

### Benefits

1. **Cleaner views** - Business logic separated
2. **Reusable** - Document class can be used anywhere
3. **Testable** - Easy to unit test documents
4. **Consistent** - Same style across all PDFs
5. **Maintainable** - Changes in one place

## Future Enhancements

- [ ] Email attachment support
- [ ] Batch PDF generation
- [ ] Digital signatures
- [ ] Custom templates per dealer
- [ ] Multi-currency support
- [ ] Export to other formats (Word, Excel)
- [ ] PDF optimization/compression
- [ ] Accessibility (PDF/A)

## Support

For issues or questions, contact development team or create GitHub issue.

---

**Version**: 1.0.0  
**Last Updated**: December 5, 2025  
**Author**: Lenza ERP Development Team
