#!/usr/bin/env bash
set -euo pipefail

# Fix frontend API base, rebuild, restart services, and verify that /api/token/ is reachable (avoid 404s).
#
# Usage:
#   sudo bash scripts/fix_api_404.sh [API_BASE] [WS_URL]
# Defaults:
#   API_BASE=https://erp.lenza.uz
#   WS_URL=wss://erp.lenza.uz
#
# What it does:
#   - Normalizes VITE_API_URL (strips trailing /api) in frontend/.env.production
#   - Rebuilds frontend
#   - Restarts gunicorn + nginx
#   - Health-checks backend on 127.0.0.1:8000 and /api/token/ via nginx (expects 200/401/405, not 404)
#   - Warns if nginx site file is missing the /api/ proxy block

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script as root (sudo)."
  exit 1
fi

APP_DIR="/opt/lenza_erp"
FRONTEND_DIR="${APP_DIR}/src/frontend"
ENV_FILE="${FRONTEND_DIR}/.env.production"
NGINX_SITE="/etc/nginx/sites-available/lenza_erp"
API_BASE_DEFAULT="https://erp.lenza.uz"
WS_URL_DEFAULT="wss://erp.lenza.uz"
HEALTH_PATH="/api/health/"
TOKEN_PATH="/api/token/"

API_BASE="${1:-$API_BASE_DEFAULT}"
WS_URL="${2:-$WS_URL_DEFAULT}"

# Normalize URLs (remove trailing / and /api)
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

if [[ ! -f "${NGINX_SITE}" ]]; then
  echo "WARNING: Nginx site file ${NGINX_SITE} not found. /api/ may not be proxied."
else
  if ! grep -q "location ^~ /api/" "${NGINX_SITE}"; then
    echo "WARNING: /api/ proxy block not found in ${NGINX_SITE}. Add it to proxy to 127.0.0.1:8000."
  fi
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

echo ">>> Checking lenza_erp.service status..."
if ! systemctl is-active --quiet lenza_erp.service; then
  echo "ERROR: lenza_erp.service is not active. Showing last 80 log lines:"
  systemctl status --no-pager lenza_erp.service || true
  journalctl -u lenza_erp.service -n 80 --no-pager || true
  exit 1
fi

echo ">>> Checking gunicorn/listening port 8000..."
if ! ss -lntp | grep -qE '127\.0\.0\.1:8000'; then
  echo "WARNING: gunicorn is not listening on 127.0.0.1:8000. Check lenza_erp.service logs (journalctl -u lenza_erp)."
fi

echo ">>> Backend health check on 127.0.0.1:8000${HEALTH_PATH}..."
if ! curl -f -m 10 "http://127.0.0.1:8000${HEALTH_PATH}"; then
  echo "WARNING: Local health check failed. Ensure gunicorn is running and database settings are correct."
fi

echo ">>> Token endpoint check via nginx (${API_BASE}${TOKEN_PATH}) (expect 200/401/405, not 404)..."
TOKEN_STATUS=$(curl -k -o /tmp/token_check.$$ -s -w "%{http_code}" -X OPTIONS "${API_BASE}${TOKEN_PATH}" || true)
rm -f /tmp/token_check.$$
if [[ "${TOKEN_STATUS}" == "404" ]]; then
  echo "WARNING: /api/token/ returned 404 via nginx. Check nginx /api/ proxy block and gunicorn status."
else
  echo "Token endpoint responded with HTTP ${TOKEN_STATUS} (this is OK as long as it's not 404)."
fi

echo "Done. Frontend now calls ${API_BASE}/api/...; services restarted and checks executed."
