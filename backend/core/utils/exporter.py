from io import BytesIO

from openpyxl import Workbook

from .temp_files import save_temp_file


def _prepare_workbook(title: str, headers: list[str]):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = title
    worksheet.append(headers)
    return workbook, worksheet


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


def export_payments_to_excel(payments):
    workbook, worksheet = _prepare_workbook(
        'Payments',
        ['Dealer', 'Date', 'Amount', 'Currency', 'Method'],
    )
    for payment in payments:
        worksheet.append(
            [
                getattr(payment.dealer, 'name', ''),
                payment.pay_date.isoformat() if payment.pay_date else '',
                float(payment.amount),
                payment.currency,
                payment.method,
            ]
        )
    return _workbook_to_file(workbook, 'payments')


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


def export_expenses_to_excel(expenses):
    workbook, worksheet = _prepare_workbook(
        'Expenses',
        ['Date', 'Type', 'Method', 'Card', 'Currency', 'Amount', 'Status', 'Comment'],
    )
    for e in expenses:
        worksheet.append(
            [
                e.date.isoformat() if e.date else '',
                getattr(e.type, 'name', ''),
                e.method,
                getattr(e.card, 'name', ''),
                e.currency,
                float(e.amount),
                e.status,
                e.comment or '',
            ]
        )
    return _workbook_to_file(workbook, 'expenses')


def _workbook_to_file(workbook: Workbook, prefix: str):
    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return save_temp_file(stream.getvalue(), prefix, '.xlsx')


def export_reconciliation_to_excel(data: dict, detailed: bool = False):
    """
    Build an Excel workbook from reconciliation data structure returned by
    services.reconciliation.get_reconciliation_data.
    When detailed=True, include per-order item lines on separate sheets or indented rows.
    """
    workbook = Workbook()
    ws_summary = workbook.active
    ws_summary.title = 'Summary'

    # Header info
    ws_summary.append(['Dealer', data.get('dealer', '')])
    ws_summary.append(['Code', data.get('dealer_code', '')])
    ws_summary.append(['Period', data.get('period', '')])
    ws_summary.append([])

    # Balances
    ws_summary.append(['Opening Balance (USD)', float(data.get('opening_balance', 0))])
    ws_summary.append(['Closing Balance (USD)', float(data.get('closing_balance', 0))])
    ws_summary.append([])

    # Orders sheet
    ws_orders = workbook.create_sheet('Orders')
    ws_orders.append(['Date', 'Order #', 'Amount USD'])
    for row in data.get('orders', []) or []:
        ws_orders.append([
            row.get('date'),
            row.get('order_no'),
            float(row.get('amount_usd', 0)),
        ])

    # Payments sheet
    ws_payments = workbook.create_sheet('Payments')
    ws_payments.append(['Date', 'Method', 'Amount USD'])
    for row in data.get('payments', []) or []:
        ws_payments.append([
            row.get('date'),
            row.get('method'),
            float(row.get('amount_usd', 0)),
        ])

    # Returns sheet
    ws_returns = workbook.create_sheet('Returns')
    ws_returns.append(['Date', 'Order #', 'Amount USD'])
    for row in data.get('returns', []) or []:
        ws_returns.append([
            row.get('date'),
            row.get('order_no'),
            float(row.get('amount_usd', 0)),
        ])

    if detailed and data.get('orders_detailed'):
        ws_details = workbook.create_sheet('Order Items')
        ws_details.append(['Order #', 'Date', 'Product', 'Quantity', 'Price USD', 'Line Total USD'])
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
