#!/usr/bin/env bash
set -euo pipefail

# Fix frontend API base, rebuild, and verify backend/nginx health to resolve login ERR_NETWORK errors.

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script as root (sudo)."
  exit 1
fi

APP_DIR="/opt/lenza_erp"
FRONTEND_DIR="${APP_DIR}/src/frontend"
BACKEND_DIR="${APP_DIR}/src/backend"
ENV_FILE="${FRONTEND_DIR}/.env.production"
API_BASE_DEFAULT="https://erp.lenza.uz"
WS_URL_DEFAULT="wss://erp.lenza.uz"
HEALTH_PATH="/api/health/"

API_BASE="${1:-$API_BASE_DEFAULT}"
WS_URL="${2:-$WS_URL_DEFAULT}"
API_BASE="${API_BASE%/}"
API_BASE="${API_BASE%/api}"
WS_URL="${WS_URL%/}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Required command '$1' not found."; exit 1; }
}

require_cmd npm
require_cmd systemctl
require_cmd curl
require_cmd ss

if [[ ! -d "${FRONTEND_DIR}" ]]; then
  echo "Frontend directory not found at ${FRONTEND_DIR}. Is the project deployed?"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo ".env.production not found at ${ENV_FILE}"
  exit 1
fi

echo ">>> Backing up current .env.production..."
cp "${ENV_FILE}" "${ENV_FILE}.$(date +%Y%m%d%H%M%S).bak"

echo ">>> Rewriting ${ENV_FILE} with normalized URLs..."
cat > "${ENV_FILE}" <<EOF
VITE_API_URL=${API_BASE}
VITE_WS_URL=${WS_URL}
VITE_DISABLE_SW=true
EOF

echo ">>> Installing frontend dependencies and rebuilding..."
cd "${FRONTEND_DIR}"
npm install
npm run build

echo ">>> Restarting services..."
systemctl restart lenza_erp.service
systemctl reload nginx

echo ">>> Checking gunicorn/listening port 8000..."
if ! ss -lntp | grep -qE '127\.0\.0\.1:8000'; then
  echo "WARNING: gunicorn is not listening on 127.0.0.1:8000. Check lenza_erp.service logs."
fi

echo ">>> Health check via nginx (${API_BASE}${HEALTH_PATH})..."
if ! curl -k -f -m 10 "${API_BASE}${HEALTH_PATH}"; then
  echo "WARNING: Health check failed. Possible causes: gunicorn down, firewall, or Nginx config."
else
  echo "Health check OK."
fi

echo "Done. Frontend now calls ${API_BASE}/api/...; services restarted and health checked."
