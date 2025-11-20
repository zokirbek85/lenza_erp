#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ushbu skriptni root sifatida ishga tushiring."
  exit 1
fi

APP_DIR="/opt/lenza_erp"
SRC_DIR="${APP_DIR}/src"
REPO_URL="https://github.com/zokirbek85/lenza_erp.git"
VENV_DIR="${APP_DIR}/venv"
BACKEND_DIR="${SRC_DIR}/backend"
FRONTEND_DIR="${SRC_DIR}/frontend"
ENV_FILE="${BACKEND_DIR}/.env"
SERVICE_FILE="/etc/systemd/system/lenza_erp.service"
BOT_SERVICE_FILE="/etc/systemd/system/lenza_erp_bot.service"
NGINX_AVAILABLE="/etc/nginx/sites-available/lenza_erp"
NGINX_ENABLED="/etc/nginx/sites-enabled/lenza_erp"
DEFAULT_DB_NAME="lenza_erp"
DEFAULT_DB_USER="lenza_user"
DEFAULT_DB_PASSWORD="ChangeMeNow123!"

echo ">>> Eski systemd servislarini to'xtatish (agar mavjud bo'lsa)..."
systemctl stop lenza_erp.service 2>/dev/null || true
systemctl disable lenza_erp.service 2>/dev/null || true
systemctl stop lenza_erp_bot.service 2>/dev/null || true
systemctl disable lenza_erp_bot.service 2>/dev/null || true

echo ">>> Eski nginx konfiguratsiyalarini o'chirish..."
rm -f "${NGINX_ENABLED}" "${NGINX_AVAILABLE}"

echo ">>> Eski kod papkasini tozalash..."
rm -rf "${APP_DIR}"

echo ">>> Zarur paketlarni o'rnatish..."
apt update
apt install -y python3 python3-venv python3-pip git nginx postgresql postgresql-contrib build-essential
apt install -y libpq-dev pkg-config libffi-dev libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libjpeg-dev zlib1g-dev
apt install -y nodejs npm

echo ">>> Postgres bazasi va foydalanuvchisini tekshirish/yaratish..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DEFAULT_DB_USER}';" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DEFAULT_DB_USER} WITH PASSWORD '${DEFAULT_DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DEFAULT_DB_NAME}';" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DEFAULT_DB_NAME} OWNER ${DEFAULT_DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DEFAULT_DB_NAME} TO ${DEFAULT_DB_USER};" >/dev/null

echo ">>> Kodni klonlash..."
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"
git clone "${REPO_URL}" src

echo ">>> Python virtual environment yaratish va kutubxonalarni o'rnatish..."
python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"
pip install --upgrade pip
pip install -r "${BACKEND_DIR}/requirements.txt"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo ">>> Namuna .env faylini yaratish..."
  cat <<'EOF' > "${ENV_FILE}"
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=PLEASE_CHANGE_ME
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,45.138.159.195,erp.lenza.uz

USE_POSTGRES=True
POSTGRES_DB=lenza_erp
POSTGRES_USER=lenza_user
POSTGRES_PASSWORD=ChangeMeNow123!
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
CHANNEL_LAYER_BACKEND=channels.layers.InMemoryChannelLayer

JWT_ACCESS_LIFETIME=30
JWT_REFRESH_LIFETIME=1440

TELEGRAM_BOT_TOKEN=PUT_TELEGRAM_TOKEN_HERE
TELEGRAM_GROUP_CHAT_ID=-1003006758530
TELEGRAM_CHAT_ID=-1003006758530

COMPANY_NAME=Lenza ERP
COMPANY_SLOGAN="Precision in Every Door"
COMPANY_ADDRESS="Farg'ona, O'zbekiston"
COMPANY_PHONE="+998 90 123 45 67"
EOF
else
  echo ">>> .env fayli mavjud, o'zgartirmadik."
fi

echo ">>> Django migratsiyalari va statik fayllar..."
cd "${BACKEND_DIR}"
python manage.py migrate
python manage.py collectstatic --noinput

echo ">>> Frontendni build qilish..."
cd "${FRONTEND_DIR}"
npm install
npm run build

echo ">>> Gunicorn systemd servis faylini yaratish..."
cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=Lenza ERP Django Service
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=${BACKEND_DIR}
Environment="DJANGO_SETTINGS_MODULE=core.settings"
Environment="PYTHONUNBUFFERED=1"
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/gunicorn core.wsgi:application --bind 127.0.0.1:8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

if [[ ! -f "${BOT_SERVICE_FILE}" ]]; then
  echo ">>> Telegram bot systemd faylini yaratish..."
  cat <<EOF > "${BOT_SERVICE_FILE}"
[Unit]
Description=Lenza ERP Telegram Bot
After=network.target

[Service]
User=root
WorkingDirectory=${BACKEND_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/python manage.py runbot
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
fi

echo ">>> Nginx konfiguratsiyasini yaratish..."
cat <<EOF > "${NGINX_AVAILABLE}"
server {
    listen 80;
    server_name erp.lenza.uz 45.138.159.195;

    root ${FRONTEND_DIR}/dist;
    index index.html;

    location /static/ {
        alias ${BACKEND_DIR}/staticfiles/;
    }

    location /media/ {
        alias ${BACKEND_DIR}/media/;
    }

    location ^~ /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"

echo ">>> Servislarni ishga tushirish..."
systemctl daemon-reload
systemctl enable lenza_erp.service
systemctl restart lenza_erp.service

if systemctl list-unit-files | grep -q "lenza_erp_bot.service"; then
  echo ">>> Telegram bot servisini hozircha faollashtirmayapmiz. Zarur bo'lsa qo'lda enable/start qiling."
fi

nginx -t
systemctl reload nginx

cat <<'EOM'
==============================================
Lenza ERP o'rnatish tugadi.

1) /opt/lenza_erp/src/backend/.env faylini real parollar va tokenlar bilan to'ldiring.
2) Superuser yaratish uchun:
     source /opt/lenza_erp/venv/bin/activate
     cd /opt/lenza_erp/src/backend
     python manage.py createsuperuser
3) Ilova frontendini brauzerda ko'rish:
     http://erp.lenza.uz
   Admin panel:
     http://erp.lenza.uz/admin/
4) Agar Telegram bot kerak bo'lsa:
     systemctl enable lenza_erp_bot
     systemctl start lenza_erp_bot

Yangilash uchun scripts/update_from_git.sh skriptidan foydalaning.
==============================================
EOM
