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
                product.stock_ok,
                product.stock_defect,
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


def _workbook_to_file(workbook: Workbook, prefix: str):
    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return save_temp_file(stream.getvalue(), prefix, '.xlsx')
