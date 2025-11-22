#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/lenza_erp"
SRC_DIR="${APP_DIR}/src"
BACKEND_DIR="${SRC_DIR}/backend"
FRONTEND_DIR="${SRC_DIR}/frontend"
VENV_DIR="${APP_DIR}/venv"

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "Xatolik: ${SRC_DIR} topilmadi. Avval setup_vps.sh bilan o'rnating."
  exit 1
fi

echo ">>> Git repodan so'nggi o'zgarishlarni olib kelish..."
cd "${SRC_DIR}"
git fetch origin
git pull origin main

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "Xatolik: ${VENV_DIR} topilmadi. Avval virtual environment yarating."
  exit 1
fi

echo ">>> Backend yangilanishi..."
cd "${BACKEND_DIR}"
source "${VENV_DIR}/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

echo ">>> Frontend yangilanishi..."
cd "${FRONTEND_DIR}"
npm install
npm run build

echo ">>> Servislarni qayta ishga tushirish..."
systemctl restart lenza_erp.service
systemctl restart lenza_erp_daphne.service
if systemctl list-unit-files | grep -q "lenza_erp_bot.service"; then
  systemctl restart lenza_erp_bot.service || echo "lenza_erp_bot servisni qayta ishga tushirishda muammo."
fi
systemctl reload nginx

echo ">>> Servislar holati..."
systemctl status lenza_erp.service --no-pager
systemctl status lenza_erp_daphne.service --no-pager

echo ">>> Yangilash muvaffaqiyatli yakunlandi."
