from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings

def get_tmp_dir() -> Path:
    tmp_dir = Path(settings.MEDIA_ROOT) / 'tmp'
    tmp_dir.mkdir(parents=True, exist_ok=True)
    return tmp_dir


def cleanup_temp_files(days: int = 7) -> None:
    tmp_dir = get_tmp_dir()
    cutoff = datetime.now() - timedelta(days=days)
    for path in tmp_dir.iterdir():
        if not path.is_file():
            continue
        try:
            modified = datetime.fromtimestamp(path.stat().st_mtime)
            if modified < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            continue


def save_temp_file(content: bytes, prefix: str, suffix: str) -> Path:
    tmp_dir = get_tmp_dir()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    file_path = tmp_dir / f"{prefix}-{timestamp}{suffix}"
    with open(file_path, 'wb') as handle:
        handle.write(content)
    cleanup_temp_files()
    return file_path
