from __future__ import annotations

from decimal import Decimal
from io import BytesIO

import pandas as pd
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.utils.temp_files import cleanup_temp_files, get_tmp_dir
from dealers.models import Dealer, Region

EXPORT_COLUMNS = ['name', 'code', 'contact', 'region', 'manager_username', 'opening_balance_usd', 'current_debt_usd']

User = get_user_model()


def _to_str(value) -> str:
    if pd.isna(value) or value is None:
        return ''
    return str(value).strip()


def _to_decimal(value) -> Decimal:
    if pd.isna(value) or value in (None, ''):
        return Decimal('0')
    try:
        return Decimal(str(value))
    except (TypeError, ValueError):
        return Decimal('0')


def _resolve_region(name: str | None):
    if not name:
        return None
    cleaned = name.strip()
    if not cleaned:
        return None
    region, _ = Region.objects.get_or_create(name=cleaned)
    return region


def _resolve_manager(username: str | None):
    if not username:
        return None
    cleaned = username.strip()
    if not cleaned:
        return None
    return User.objects.filter(username=cleaned).first()


def _write_dataframe(dataframe: pd.DataFrame, filename: str) -> str:
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        dataframe.to_excel(writer, index=False, sheet_name='Dealers')
    buffer.seek(0)
    tmp_dir = get_tmp_dir()
    tmp_dir.mkdir(parents=True, exist_ok=True)
    file_path = tmp_dir / filename
    with open(file_path, 'wb') as handle:
        handle.write(buffer.getvalue())
    cleanup_temp_files()
    return str(file_path)


def export_dealers_to_excel() -> str:
    queryset = Dealer.objects.select_related('region', 'manager_user').all()
    data = []
    for dealer in queryset:
        data.append(
            {
                'name': dealer.name,
                'code': dealer.code,
                'contact': dealer.contact or '',
                'region': dealer.region.name if dealer.region else '',
                'manager_username': dealer.manager_user.username if dealer.manager_user else '',
                'opening_balance_usd': float(dealer.opening_balance_usd or 0),
                'current_debt_usd': float(dealer.current_debt_usd or 0),
            }
        )
    dataframe = pd.DataFrame(data, columns=EXPORT_COLUMNS)
    filename = f"dealers_export_{timezone.now():%Y%m%d}.xlsx"
    return _write_dataframe(dataframe, filename)


def generate_dealer_import_template() -> str:
    dataframe = pd.DataFrame(columns=EXPORT_COLUMNS)
    filename = f"dealers_import_template_{timezone.now():%Y%m%d}.xlsx"
    return _write_dataframe(dataframe, filename)


def import_dealers_from_excel(file_obj) -> dict:
    df = pd.read_excel(file_obj)
    created = 0
    updated = 0
    skipped = 0
    for row in df.to_dict(orient='records'):
        code = _to_str(row.get('code'))
        name = _to_str(row.get('name'))
        if not code:
            skipped += 1
            continue
        defaults = {
            'name': name or code,
            'contact': _to_str(row.get('contact')),
            'region': _resolve_region(_to_str(row.get('region'))),
            'manager_user': _resolve_manager(_to_str(row.get('manager_username'))),
            'opening_balance_usd': _to_decimal(row.get('opening_balance_usd')),
        }
        _, was_created = Dealer.objects.update_or_create(code=code, defaults=defaults)
        if was_created:
            created += 1
        else:
            updated += 1
    return {'created': created, 'updated': updated, 'skipped': skipped}
