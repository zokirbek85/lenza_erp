"""
Orders Excel Import/Export Tools
Provides template generation and bulk import functionality for historical order data.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation
from io import BytesIO
from datetime import date, datetime

import pandas as pd
from django.db import transaction
from django.utils import timezone

from catalog.models import Product
from dealers.models import Dealer
from orders.models import Order, OrderItem
from core.utils.temp_files import cleanup_temp_files, get_tmp_dir


IMPORT_TEMPLATE_COLUMNS = [
    'dealer_name',      # Dealer name (will be matched or created)
    'product_name',     # Product name (will be matched by name)
    'qty',              # Quantity (decimal, min 0.01)
    'price_usd',        # Price in USD (decimal)
    'value_date',       # Order date (YYYY-MM-DD format)
    'is_reserve',       # Reserve order flag (YES/NO or 1/0)
    'note',             # Optional note
]


def _to_str(value) -> str:
    """Convert value to string, handling null/empty."""
    if pd.isna(value) or value is None:
        return ''
    return str(value).strip()


def _to_decimal(value, default=Decimal('0')) -> Decimal:
    """Convert value to Decimal, with fallback."""
    if pd.isna(value) or value in (None, ''):
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return default


def _to_quantity(value) -> Decimal:
    """Convert value to quantity (2 decimal places, non-negative)."""
    if pd.isna(value) or value in (None, ''):
        return Decimal('0.00')
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal('0.00')
    if amount < Decimal('0.01'):
        return Decimal('0.00')
    return amount.quantize(Decimal('0.01'))


def _to_date(value) -> date | None:
    """Convert value to date object."""
    if pd.isna(value) or value is None:
        return None
    
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    
    # Try parsing string
    value_str = str(value).strip()
    if not value_str:
        return None
    
    # Common date formats
    for fmt in ['%Y-%m-%d', '%d.%m.%Y', '%d/%m/%Y', '%m/%d/%Y']:
        try:
            return datetime.strptime(value_str, fmt).date()
        except ValueError:
            continue
    
    return None


def _to_bool(value) -> bool:
    """Convert value to boolean."""
    if pd.isna(value) or value is None:
        return False
    
    if isinstance(value, bool):
        return value
    
    value_str = str(value).strip().upper()
    return value_str in ('YES', 'Y', 'TRUE', 'T', '1', 'HA', 'ДА')


def _get_dealer(name: str) -> Dealer | None:
    """Get or create dealer by name."""
    if not name:
        return None
    
    dealer_name = name.strip()
    if not dealer_name:
        return None
    
    # Try exact match first
    dealer = Dealer.objects.filter(name__iexact=dealer_name).first()
    if dealer:
        return dealer
    
    # If not found, create new dealer
    dealer = Dealer.objects.create(name=dealer_name)
    return dealer


def _get_product(name: str) -> Product | None:
    """Get product by name (case-insensitive)."""
    if not name:
        return None
    
    product_name = name.strip()
    if not product_name:
        return None
    
    return Product.objects.filter(name__iexact=product_name).first()


def _write_dataframe(dataframe: pd.DataFrame, filename: str) -> str:
    """Write DataFrame to Excel file and return file path."""
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        dataframe.to_excel(writer, index=False, sheet_name='Orders')
    buffer.seek(0)

    tmp_dir = get_tmp_dir()
    tmp_dir.mkdir(parents=True, exist_ok=True)
    file_path = tmp_dir / filename
    with open(file_path, 'wb') as handle:
        handle.write(buffer.getvalue())
    cleanup_temp_files()
    return str(file_path)


def generate_import_template() -> str:
    """
    Generate Excel template for bulk order import.
    Returns path to generated file.
    """
    # Create empty DataFrame with predefined columns
    dataframe = pd.DataFrame(columns=IMPORT_TEMPLATE_COLUMNS)
    
    # Add sample row for reference
    sample_data = {
        'dealer_name': 'Example Dealer',
        'product_name': 'Product Name Example',
        'qty': 10.00,
        'price_usd': 25.50,
        'value_date': timezone.now().date().isoformat(),
        'is_reserve': 'NO',
        'note': 'Sample note (optional)',
    }
    dataframe = pd.DataFrame([sample_data], columns=IMPORT_TEMPLATE_COLUMNS)
    
    filename = f"orders_import_template_{timezone.now():%Y%m%d_%H%M%S}.xlsx"
    return _write_dataframe(dataframe, filename)


def import_orders_from_excel(file_obj, created_by=None) -> dict:
    """
    Import orders from Excel file.
    
    Args:
        file_obj: File object containing Excel data
        created_by: User creating the orders (optional)
    
    Returns:
        dict with import statistics: {
            'orders_created': int,
            'items_created': int,
            'errors': list of error messages,
        }
    """
    try:
        df = pd.read_excel(file_obj)
    except Exception as e:
        return {
            'orders_created': 0,
            'items_created': 0,
            'errors': [f'Failed to read Excel file: {str(e)}'],
        }
    
    # Group rows by order (dealer + value_date + note)
    orders_created = 0
    items_created = 0
    errors = []
    
    # Group by dealer_name, value_date, note to create single orders
    df['_group_key'] = (
        df['dealer_name'].fillna('').astype(str) + '|' +
        df['value_date'].fillna('').astype(str) + '|' +
        df['note'].fillna('').astype(str) + '|' +
        df['is_reserve'].fillna('').astype(str)
    )
    
    for group_key, group_df in df.groupby('_group_key'):
        # Get order-level data from first row of group
        first_row = group_df.iloc[0]
        
        dealer_name = _to_str(first_row.get('dealer_name'))
        if not dealer_name:
            errors.append(f'Row with empty dealer_name skipped')
            continue
        
        dealer = _get_dealer(dealer_name)
        if not dealer:
            errors.append(f'Could not find/create dealer: {dealer_name}')
            continue
        
        value_date = _to_date(first_row.get('value_date'))
        if not value_date:
            value_date = timezone.now().date()
        
        is_reserve = _to_bool(first_row.get('is_reserve'))
        note = _to_str(first_row.get('note'))
        
        # Process items for this order
        order_items = []
        for _, row in group_df.iterrows():
            product_name = _to_str(row.get('product_name'))
            if not product_name:
                errors.append(f'Row with empty product_name skipped (dealer: {dealer_name})')
                continue
            
            product = _get_product(product_name)
            if not product:
                errors.append(f'Product not found: {product_name} (dealer: {dealer_name})')
                continue
            
            qty = _to_quantity(row.get('qty'))
            if qty <= 0:
                errors.append(f'Invalid quantity for product {product_name}: {row.get("qty")} (dealer: {dealer_name})')
                continue
            
            price_usd = _to_decimal(row.get('price_usd'), default=product.sell_price_usd)
            if price_usd < 0:
                errors.append(f'Invalid price for product {product_name}: {row.get("price_usd")} (dealer: {dealer_name})')
                continue
            
            order_items.append({
                'product': product,
                'qty': qty,
                'price_usd': price_usd,
            })
        
        # Create order if we have valid items
        if order_items:
            try:
                with transaction.atomic():
                    order = Order.objects.create(
                        dealer=dealer,
                        created_by=created_by,
                        status=Order.Status.DELIVERED,  # Historical orders are delivered
                        note=note,
                        value_date=value_date,
                        is_reserve=is_reserve,
                    )
                    
                    for item_data in order_items:
                        OrderItem.objects.create(
                            order=order,
                            product=item_data['product'],
                            qty=item_data['qty'],
                            price_usd=item_data['price_usd'],
                            status=OrderItem.ItemStatus.SHIPPED,
                        )
                        items_created += 1
                    
                    order.recalculate_totals()
                    orders_created += 1
            except Exception as e:
                errors.append(f'Failed to create order for dealer {dealer_name}: {str(e)}')
    
    return {
        'orders_created': orders_created,
        'items_created': items_created,
        'errors': errors,
    }
