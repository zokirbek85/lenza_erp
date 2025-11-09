from __future__ import annotations

from typing import Any

from core.models import CompanyInfo


def get_company_info() -> dict[str, Any]:
    info = CompanyInfo.objects.first()
    if not info:
        return {}
    logo_url = None
    if info.logo and hasattr(info.logo, 'url'):
        try:
            logo_url = info.logo.url
        except ValueError:
            logo_url = None
    return {
        'name': info.name,
        'slogan': info.slogan,
        'logo': logo_url,
        'address': info.address,
        'phone': info.phone,
        'email': info.email,
        'website': info.website,
        'bank_name': info.bank_name,
        'account_number': info.account_number,
        'inn': info.inn,
        'mfo': info.mfo,
        'director': info.director,
    }
