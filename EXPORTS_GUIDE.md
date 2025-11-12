# Exports Guide

This document lists the export endpoints (PDF and XLSX) available in Lenza ERP, their parameters, and notes for frontend downloads.

All endpoints require authentication (Bearer token). PDFs are branded with company information and include a QR-code verification footer. Excel files are generated via pandas + openpyxl and streamed from memory (BytesIO).

## 📋 Unified Report System

### Overview
All major modules (orders, payments, ledger, expenses) now support a unified monthly report endpoint:

**Pattern:** `GET /api/{module}/report/?month=YYYY-MM&format=pdf|xlsx|json`

- **month**: Optional. Format YYYY-MM (e.g., `2025-11`). Defaults to current month if omitted.
- **format**: Optional. Values: `pdf`, `xlsx`, or `json`. Defaults to `json`.
- **Response**: 
  - `pdf`: Branded PDF with QR verification
  - `xlsx`: Excel file with company header
  - `json`: Summary data (row count, totals, etc.)

### Architecture
All report endpoints inherit from `BaseReportMixin` (`backend/core/mixins/report_mixin.py`) which provides:
- Automatic month filtering via `date_field`
- Unified PDF/XLSX/JSON generation
- Company branding and QR verification
- Consistent error handling
- DRY principle compliance

## 📊 Module-Specific Reports

### Expenses
**Monthly report by type:**
- GET `/api/expenses/report/?month=YYYY-MM&format=pdf`
- GET `/api/expenses/report/?month=YYYY-MM&format=xlsx`
- GET `/api/expenses/report/?month=YYYY-MM` (JSON, default)

**Features:**
- Groups by ExpenseType
- Shows totals in USD and UZS
- Only includes confirmed expenses (`status='tasdiqlangan'`)
- Includes currency rate used

**Unified export (all expenses):**
- GET `/api/expenses/export/?format=pdf`
- GET `/api/expenses/export/?format=xlsx`

### Ledger (Cash Flow)
**Monthly report:**
- GET `/api/ledger-entries/report/?month=YYYY-MM&format=pdf`
- GET `/api/ledger-entries/report/?month=YYYY-MM&format=xlsx`
- GET `/api/ledger-entries/report/?month=YYYY-MM` (JSON, default)
- Alias: GET `/api/ledger/report/?month=YYYY-MM&format=...`

**Features:**
- All ledger entries for the month
- Shows account, type, currency, amount, and USD equivalent
- Includes total in USD

**Unified export (all entries):**
- GET `/api/ledger-entries/export/?format=pdf`
- GET `/api/ledger-entries/export/?format=xlsx`
- Alias: GET `/api/ledger/export/?format=...`

### Payments
**Monthly report:**
- GET `/api/payments/report/?month=YYYY-MM&format=pdf`
- GET `/api/payments/report/?month=YYYY-MM&format=xlsx`
- GET `/api/payments/report/?month=YYYY-MM` (JSON, default)

**Features:**
- All payments for the month
- Shows date, dealer, amount, currency, method, card
- Includes total in USD

**Unified export (all payments):**
- GET `/api/payments/export/?format=pdf`
- GET `/api/payments/export/?format=xlsx`

### Orders
**Monthly report:**
- GET `/api/orders/report/?month=YYYY-MM&format=pdf`
- GET `/api/orders/report/?month=YYYY-MM&format=xlsx`
- GET `/api/orders/report/?month=YYYY-MM` (JSON, default)

**Features:**
- All orders for the month (filtered by `value_date`)
- Shows order number, date, dealer, status, USD, UZS
- Includes total in USD

**Other order exports:**
- GET `/api/orders/report/pdf/` (legacy summary)
- GET `/api/orders/<id>/invoice/` (single order invoice PDF)
- GET `/api/orders/export/excel/` (legacy Excel export)

## 🔍 Other Export Endpoints

### Catalog (Products)
- Products report PDF: GET `/api/catalog/report/pdf/`
- Products Excel: GET `/api/products/export/excel/`

### Returns
- Returns report PDF: GET `/api/returns/export/pdf/`
- Returns Excel: GET `/api/returns/export/excel/`

### Dealers
- Dealer balances PDF: GET `/api/dealers/balance/pdf/`
- Dealers Excel: GET `/api/dealers/export/excel/`
- Dealer reconciliation PDF/Excel:
  - GET `/api/dealers/<id>/reconciliation/pdf/`
  - GET `/api/dealers/<id>/reconciliation/excel/`

## 💻 Frontend Integration

### Download Helper
Use the shared download utility (`frontend/src/utils/download.ts`):

```ts
import { downloadFile } from '@/utils/download'
import dayjs from 'dayjs'

// Monthly PDF report
const month = dayjs().format('YYYY-MM')
await downloadFile(`/api/expenses/report/?month=${month}&format=pdf`, 'chiqimlar.pdf')

// Monthly Excel report
await downloadFile(`/api/expenses/report/?month=${month}&format=xlsx`, 'chiqimlar.xlsx')

// JSON preview (default)
const response = await axios.get(`/api/expenses/report/?month=${month}`)
console.log(response.data) // { month, total, rows, count, format: 'json' }
```

### Example React Component
```tsx
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/utils/download'
import dayjs from 'dayjs'

export function ExpenseReports() {
  const month = dayjs().format('YYYY-MM')
  
  return (
    <div className="flex gap-2">
      <Button onClick={() => downloadFile(`/api/expenses/report/?month=${month}&format=pdf`, 'chiqimlar.pdf')}>
        PDF yuklab olish
      </Button>
      <Button onClick={() => downloadFile(`/api/expenses/report/?month=${month}&format=xlsx`, 'chiqimlar.xlsx')}>
        Excel yuklab olish
      </Button>
    </div>
  )
}
```

## 🔐 Verification (QR)
All PDFs include a QR code that links to `/verify/<doc_type>/<doc_id>/`, enabling users to verify document authenticity.

Report QR format:
- Expenses: `/verify/expenses-report/YYYY-MM/`
- Ledger: `/verify/ledger-report/YYYY-MM/`
- Payments: `/verify/payments-report/YYYY-MM/`
- Orders: `/verify/orders-report/YYYY-MM/`

## 🛠️ Technical Details

### BaseReportMixin Configuration
Each ViewSet inheriting from `BaseReportMixin` must configure:

```python
class MyViewSet(viewsets.ModelViewSet, BaseReportMixin):
    # Required configuration
    date_field = "date"  # field used for month filtering
    filename_prefix = "mymodule"  # e.g., "expenses", "ledger"
    title_prefix = "My Report Title"  # appears in PDF header
    report_template = "mymodule/report.html"  # PDF template path
    
    # Required methods
    def get_report_rows(self, queryset):
        """Return list of dicts for Excel/PDF rows"""
        return [{"Column": value} for obj in queryset]
    
    def get_report_total(self, queryset):
        """Return total amount (usually in USD)"""
        return queryset.aggregate(Sum("amount"))["amount__sum"] or 0
```

### URL Routing
Explicit URL mappings ensure report actions resolve correctly:

```python
# backend/core/urls.py
path('api/expenses/report/', ExpenseViewSet.as_view({'get': 'report'}), name='expenses-report'),
path('api/expenses/report', ExpenseViewSet.as_view({'get': 'report'})),  # without trailing slash
```

## 🧪 Testing
All report endpoints are covered by smoke tests in `backend/core/tests/test_exports_smoke.py`:

```bash
cd backend
python manage.py test core.tests.test_exports_smoke
```

## 🐛 Troubleshooting
- **404 on /report/ endpoints**: Ensure explicit URL mappings are present in `backend/core/urls.py`. Restart dev server after changes.
- **PDFs fail to render**: Verify WeasyPrint dependencies (Cairo/Pango/GTK) are installed. On Windows, ensure the bundled wheels work or refer to WeasyPrint docs.
- **Excel files are empty**: Check that `get_report_rows()` returns non-empty list. Verify `filename_prefix` is set correctly.
- **QR codes not showing**: Ensure `qrcode` and `Pillow` packages are installed and up to date.
- **Currency rate errors**: Some reports require `CurrencyRate` records. Seed test data if needed.
