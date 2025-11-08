import json
from pathlib import Path
from typing import Any, Dict

from django.conf import settings

CONFIG_FILE = Path(settings.BASE_DIR) / 'config.json'
DEFAULT_CONFIG = {
    'LOW_STOCK_THRESHOLD': 5,
    'BACKUP_PATH': str(Path(settings.BASE_DIR) / 'backups'),
    'DEFAULT_EXCHANGE_RATE': '12500.00',
}
_cache: Dict[str, Any] | None = None


def _ensure_defaults(data: Dict[str, Any]) -> Dict[str, Any]:
    merged = {**DEFAULT_CONFIG, **data}
    return merged


def load_config() -> Dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as handle:
            try:
                data = json.load(handle)
            except json.JSONDecodeError:
                data = {}
    else:
        data = {}
    _cache = _ensure_defaults(data)
    return _cache


def save_config(data: Dict[str, Any]) -> Dict[str, Any]:
    global _cache
    cleaned = _ensure_defaults(data)
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as handle:
        json.dump(cleaned, handle, indent=2)
    _cache = cleaned
    return cleaned


def update_config(partial: Dict[str, Any]) -> Dict[str, Any]:
    config = load_config().copy()
    config.update(partial)
    return save_config(config)


def get_config_value(key: str):
    return load_config().get(key, DEFAULT_CONFIG.get(key))
