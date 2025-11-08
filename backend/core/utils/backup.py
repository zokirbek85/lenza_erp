import gzip
import os
import subprocess
from datetime import datetime
from pathlib import Path

from django.conf import settings

from core.config import get_config_value


def _ensure_backup_dir() -> Path:
    backup_dir = Path(get_config_value('BACKUP_PATH') or (Path(settings.BASE_DIR) / 'backups'))
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def create_backup() -> Path:
    db = settings.DATABASES['default']
    if db['ENGINE'] != 'django.db.backends.postgresql':
        raise ValueError('Backup only supported for PostgreSQL databases.')

    backup_dir = _ensure_backup_dir()
    filename = backup_dir / f"backup-{datetime.now():%Y%m%d%H%M%S}.sql.gz"

    env = os.environ.copy()
    password = db.get('PASSWORD')
    if password:
        env['PGPASSWORD'] = password

    cmd = [
        'pg_dump',
        '-h', db.get('HOST') or 'localhost',
        '-p', str(db.get('PORT') or 5432),
        '-U', db.get('USER') or 'postgres',
        db['NAME'],
    ]

    with gzip.open(filename, 'wb') as gz:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
        stdout, stderr = process.communicate()
        if process.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {stderr.decode()}")
        gz.write(stdout)

    return filename


def get_latest_backup() -> Path | None:
    backup_dir = _ensure_backup_dir()
    backups = sorted(backup_dir.glob('backup-*.sql.gz'), reverse=True)
    return backups[0] if backups else None
