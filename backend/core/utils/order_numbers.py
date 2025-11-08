from __future__ import annotations

from datetime import date


def generate_order_number(sequence: int = 1, order_date: date | None = None) -> str:
    """Return an order number such as ORD-08.11.2025-001."""
    order_date = order_date or date.today()
    return f"ORD-{order_date:%d.%m.%Y}-{sequence:03d}"
