from io import BytesIO

from openpyxl import Workbook

from .excel_export import prepare_workbook, workbook_to_bytes
from .temp_files import save_temp_file


def _prepare_workbook(title: str, headers: list[str]):
    """Legacy wrapper - use prepare_workbook from excel_export instead."""
    return prepare_workbook(title, headers)


def export_orders_to_excel(orders):
    workbook, worksheet = _prepare_workbook(
        'Orders',
        ['Display #', 'Dealer', 'Status', 'Value USD', 'Value Date'],
    )
    for order in orders:
        worksheet.append(
            [
                getattr(order, 'display_no', ''),
                getattr(order.dealer, 'name', ''),
                order.status,
                float(order.total_usd),
                order.value_date.isoformat() if order.value_date else '',
            ]
        )
    return _workbook_to_file(workbook, 'orders')


def export_products_to_excel(products):
    workbook, worksheet = _prepare_workbook(
        'Products',
        ['SKU', 'Name', 'Brand', 'Category', 'Sell USD', 'Stock OK', 'Stock Defect'],
    )
    for product in products:
        worksheet.append(
            [
                product.sku,
                product.name,
                getattr(product.brand, 'name', ''),
                getattr(product.category, 'name', ''),
                float(product.sell_price_usd),
                float(product.stock_ok or 0),
                float(product.stock_defect or 0),
            ]
        )
    return _workbook_to_file(workbook, 'products')


# export_payments_to_excel removed - Payment module deleted

def export_returns_to_excel(returns):
    workbook, worksheet = _prepare_workbook(
        'Returns',
        ['Dealer', 'Product', 'Quantity', 'Return Type', 'Reason', 'Created At'],
    )
    for entry in returns:
        worksheet.append(
            [
                getattr(entry.dealer, 'name', ''),
                getattr(entry.product, 'name', ''),
                float(entry.quantity or 0),
                entry.get_return_type_display() if hasattr(entry, 'get_return_type_display') else entry.return_type,
                entry.reason or '',
                entry.created_at.isoformat() if entry.created_at else '',
            ]
        )
    return _workbook_to_file(workbook, 'returns')


# export_expenses_to_excel removed - Expense module deleted

def _workbook_to_file(workbook: Workbook, prefix: str):
    """
    Save openpyxl Workbook to temporary file.
    
    CRITICAL: Do NOT add UTF-8 BOM to XLSX files!
    XLSX is a ZIP archive and must start with PK signature (0x504B0304).
    Adding BOM corrupts the ZIP structure and Excel cannot open the file.
    
    UTF-8 BOM is only for CSV/TXT files, never for XLSX.
    """
    content = workbook_to_bytes(workbook)
    return save_temp_file(content, prefix, '.xlsx')


def export_reconciliation_to_excel(data: dict, detailed: bool = False, language: str = 'uz'):
    """
    Build an Excel workbook from reconciliation data structure returned by
    services.reconciliation.get_reconciliation_data.
    When detailed=True, include per-order item lines on separate sheets or indented rows.
    language: 'uz', 'ru', or 'en' for internationalization.
    """
    # Translation dictionaries
    translations = {
        'uz': {
            'summary': 'Xulosa',
            'orders': 'Buyurtmalar',
            'payments': 'To\'lovlar',
            'returns': 'Qaytarishlar',
            'order_items': 'Buyurtma detallari',
            'dealer': 'Diler',
            'code': 'Kod',
            'period': 'Davr',
            'opening_balance': 'Boshlang\'ich balans (USD)',
            'closing_balance': 'Yakuniy balans (USD)',
            'date': 'Sana',
            'order_no': 'Buyurtma raqami',
            'amount_usd': 'Summa (USD)',
            'method': 'Usul',
            'product': 'Mahsulot',
            'quantity': 'Miqdor',
            'price_usd': 'Narx (USD)',
            'line_total_usd': 'Jami (USD)',
        },
        'ru': {
            'summary': 'Сводка',
            'orders': 'Заказы',
            'payments': 'Платежи',
            'returns': 'Возвраты',
            'order_items': 'Детали заказа',
            'dealer': 'Дилер',
            'code': 'Код',
            'period': 'Период',
            'opening_balance': 'Начальный баланс (USD)',
            'closing_balance': 'Конечный баланс (USD)',
            'date': 'Дата',
            'order_no': 'Номер заказа',
            'amount_usd': 'Сумма (USD)',
            'method': 'Метод',
            'product': 'Продукт',
            'quantity': 'Количество',
            'price_usd': 'Цена (USD)',
            'line_total_usd': 'Итого (USD)',
        },
        'en': {
            'summary': 'Summary',
            'orders': 'Orders',
            'payments': 'Payments',
            'returns': 'Returns',
            'order_items': 'Order Items',
            'dealer': 'Dealer',
            'code': 'Code',
            'period': 'Period',
            'opening_balance': 'Opening Balance (USD)',
            'closing_balance': 'Closing Balance (USD)',
            'date': 'Date',
            'order_no': 'Order #',
            'amount_usd': 'Amount (USD)',
            'method': 'Method',
            'product': 'Product',
            'quantity': 'Quantity',
            'price_usd': 'Price (USD)',
            'line_total_usd': 'Line Total (USD)',
        },
    }
    
    # Get translations for selected language
    t = translations.get(language, translations['uz'])
    
    workbook = Workbook()
    ws_summary = workbook.active
    ws_summary.title = t['summary']

    # Header info
    ws_summary.append([t['dealer'], data.get('dealer', '')])
    ws_summary.append([t['code'], data.get('dealer_code', '')])
    ws_summary.append([t['period'], data.get('period', '')])
    ws_summary.append([])

    # Balances
    ws_summary.append([t['opening_balance'], float(data.get('opening_balance', 0))])
    ws_summary.append([t['closing_balance'], float(data.get('closing_balance', 0))])
    ws_summary.append([])

    # Orders sheet
    ws_orders = workbook.create_sheet(t['orders'])
    ws_orders.append([t['date'], t['order_no'], t['amount_usd']])
    for row in data.get('orders', []) or []:
        ws_orders.append([
            row.get('date'),
            row.get('order_no'),
            float(row.get('amount_usd', 0)),
        ])

    # Payments sheet
    ws_payments = workbook.create_sheet(t['payments'])
    ws_payments.append([t['date'], t['method'], t['amount_usd']])
    for row in data.get('payments', []) or []:
        ws_payments.append([
            row.get('date'),
            row.get('method'),
            float(row.get('amount_usd', 0)),
        ])

    # Returns sheet
    ws_returns = workbook.create_sheet(t['returns'])
    ws_returns.append([t['date'], t['order_no'], t['amount_usd']])
    for row in data.get('returns', []) or []:
        ws_returns.append([
            row.get('date'),
            row.get('order_no'),
            float(row.get('amount_usd', 0)),
        ])

    if detailed and data.get('orders_detailed'):
        ws_details = workbook.create_sheet(t['order_items'])
        ws_details.append([t['order_no'], t['date'], t['product'], t['quantity'], t['price_usd'], t['line_total_usd']])
        for od in data.get('orders_detailed', []) or []:
            order_no = od.get('order_number')
            order_date = od.get('date')
            for item in od.get('items', []) or []:
                ws_details.append([
                    order_no,
                    order_date,
                    item.get('product_name'),
                    float(item.get('quantity', 0)),
                    float(item.get('price', 0)),
                    float(item.get('total', 0)),
                ])

    return _workbook_to_file(workbook, 'reconciliation')
