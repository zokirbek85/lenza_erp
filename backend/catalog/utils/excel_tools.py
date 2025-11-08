from __future__ import annotations

from decimal import Decimal
from io import BytesIO
import re

import pandas as pd
from django.utils import timezone

from catalog.models import Brand, Category, Product
from core.utils.temp_files import cleanup_temp_files, get_tmp_dir

EXPORT_COLUMNS = [
    'sku',
    'name',
    'brand',
    'category',
    'size',
    'cost_usd',
    'sell_price_usd',
    'stock_ok',
    'stock_defect',
]


def _to_str(value) -> str:
    if pd.isna(value) or value is None:
        return ''
    return str(value).strip()


def _to_decimal(value) -> Decimal:
    if pd.isna(value) or value is None or value == '':
        return Decimal('0')
    return Decimal(str(value))


def _to_int(value) -> int:
    if pd.isna(value) or value in (None, ''):
        return 0
    try:
        parsed = int(value)
        if parsed < 0:
            return 0
        return parsed
    except (TypeError, ValueError):
        return 0


def _get_brand(name: str | None):
    if not name:
        return None
    brand_name = name.strip()
    if not brand_name:
        return None
    brand, _ = Brand.objects.get_or_create(name=brand_name)
    return brand


def _get_category(name: str | None):
    if not name:
        return None
    category_name = name.strip()
    if not category_name:
        return None
    category, _ = Category.objects.get_or_create(name=category_name)
    return category


def _write_dataframe(dataframe: pd.DataFrame, filename: str) -> str:
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        dataframe.to_excel(writer, index=False, sheet_name='Products')
    buffer.seek(0)

    tmp_dir = get_tmp_dir()
    tmp_dir.mkdir(parents=True, exist_ok=True)
    file_path = tmp_dir / filename
    with open(file_path, 'wb') as handle:
        handle.write(buffer.getvalue())
    cleanup_temp_files()
    return str(file_path)


def export_products_to_excel() -> str:
    queryset = Product.objects.select_related('brand', 'category').all()
    data = []
    for product in queryset:
        data.append(
            {
                'name': product.name,
                'sku': product.sku,
                'brand': product.brand.name if product.brand else '',
                'category': product.category.name if product.category else '',
                'size': product.size or '',
                'cost_usd': float(product.cost_usd or 0),
                'sell_price_usd': float(product.sell_price_usd or 0),
                'stock_ok': product.stock_ok,
                'stock_defect': product.stock_defect,
            }
        )

    dataframe = pd.DataFrame(data, columns=EXPORT_COLUMNS)
    filename = f"products_export_{timezone.now():%Y%m%d}.xlsx"
    return _write_dataframe(dataframe, filename)


def generate_import_template() -> str:
    dataframe = pd.DataFrame(columns=EXPORT_COLUMNS)
    filename = f"products_import_template_{timezone.now():%Y%m%d}.xlsx"
    return _write_dataframe(dataframe, filename)


def import_products_from_excel(file_obj) -> dict:
    df = pd.read_excel(file_obj)
    created = 0
    updated = 0
    for row in df.to_dict(orient='records'):
        sku = _to_str(row.get('sku'))
        name = _to_str(row.get('name')) or sku
        if not sku:
            sku = _generate_sku(name or 'PRODUCT')
        defaults = {
            'name': name,
            'brand': _get_brand(_to_str(row.get('brand'))),
            'category': _get_category(_to_str(row.get('category'))),
            'size': _to_str(row.get('size')),
            'cost_usd': _to_decimal(row.get('cost_usd')),
            'sell_price_usd': _to_decimal(row.get('sell_price_usd')),
            'stock_ok': _to_int(row.get('stock_ok')),
            'stock_defect': _to_int(row.get('stock_defect')),
        }
        _, was_created = Product.objects.update_or_create(sku=sku, defaults=defaults)
        if was_created:
            created += 1
        else:
            updated += 1
    return {'imported': created, 'updated': updated}
def _generate_sku(name: str) -> str:
    base = re.sub(r'[^A-Z0-9]', '', (name or 'PRD').upper()) or 'PRD'
    base = base[:8]
    candidate = base
    counter = 1
    while Product.objects.filter(sku=candidate).exists():
        suffix = f"{counter:02d}"
        candidate = (base[: max(0, 8 - len(suffix))] + suffix) or f"PRD{counter:02d}"
        counter += 1
    return candidate
