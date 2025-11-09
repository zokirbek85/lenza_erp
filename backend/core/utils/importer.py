from decimal import Decimal, InvalidOperation

import pandas as pd

from catalog.models import Brand, Category, Product


def _to_quantity(value) -> Decimal:
    try:
        amount = Decimal(str(value or 0))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal('0.00')
    if amount < 0:
        return Decimal('0.00')
    return amount.quantize(Decimal('0.01'))


def _get_or_create_brand(name: str | None):
    if not name:
        return None
    brand, _ = Brand.objects.get_or_create(name=name.strip())
    return brand


def _get_or_create_category(name: str | None):
    if not name:
        return None
    category, _ = Category.objects.get_or_create(name=name.strip())
    return category


def import_products_from_excel(file_obj) -> dict:
    df = pd.read_excel(file_obj)
    created = 0
    updated = 0
    for _, row in df.iterrows():
        name = str(row.get('name', '')).strip()
        if not name:
            continue
        defaults = {}
        brand = _get_or_create_brand(row.get('brand'))
        category = _get_or_create_category(row.get('category'))
        defaults['brand'] = brand
        defaults['category'] = category
        defaults['size'] = str(row.get('size', '') or '')
        defaults['cost_usd'] = Decimal(str(row.get('cost_usd', 0) or 0))
        defaults['sell_price_usd'] = Decimal(str(row.get('sell_price_usd', 0) or 0))
        defaults['stock_ok'] = _to_quantity(row.get('stock_ok', 0))
        defaults['stock_defect'] = _to_quantity(row.get('stock_defect', 0))
        product, was_created = Product.objects.update_or_create(
            name=name,
            defaults=defaults,
        )
        if was_created:
            created += 1
        else:
            updated += 1
    return {'created': created, 'updated': updated, 'total': int(created + updated)}
