#!/usr/bin/env bash
# ========================================
# Lenza ERP Backend Docker Entrypoint
# This is the new production entrypoint script
# Replaces entrypoint.sh with better error handling
# ========================================

set -e  # Exit immediately if a command exits with a non-zero status
set -u  # Treat unset variables as an error

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command (gunicorn or daphne)
SERVER_MODE="${1:-gunicorn}"

log_info "Starting Lenza ERP Backend in ${SERVER_MODE} mode..."

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
max_attempts=30
attempt=0

while ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        log_error "PostgreSQL is not available after ${max_attempts} attempts. Exiting."
        exit 1
    fi
    log_warn "PostgreSQL is unavailable - waiting (attempt ${attempt}/${max_attempts})"
    sleep 2
done

log_info "PostgreSQL is ready!"

# Ensure media subdirectories exist with proper permissions
log_info "Creating media subdirectories..."
mkdir -p /app/media/catalog/variants \
         /app/media/catalog/products \
         /app/media/catalog/kits \
         /app/media/exports \
         /app/media/tmp || {
    log_warn "Could not create media directories (may already exist)"
}

# Run database migrations
log_info "Running database migrations..."
python manage.py migrate --noinput || {
    log_error "Database migration failed"
    exit 1
}

# Collect static files
log_info "Collecting static files..."
python manage.py collectstatic --noinput --clear || {
    log_warn "Static file collection failed, continuing anyway"
}

# Compile translation messages if .po files exist
if ls locale/*/LC_MESSAGES/*.po 1> /dev/null 2>&1; then
    log_info "Compiling translation messages..."
    python manage.py compilemessages --ignore=.venv || {
        log_warn "Translation compilation failed, continuing anyway"
    }
fi

# Start the appropriate server
if [ "$SERVER_MODE" = "daphne" ]; then
    # ASGI mode with Daphne (for WebSocket support via Channels)
    log_info "Starting Daphne ASGI server..."
    exec daphne \
        -b 0.0.0.0 \
        -p 8000 \
        --access-log - \
        --proxy-headers \
        core.asgi:application
else
    # WSGI mode with Gunicorn (default, more stable for HTTP-only)
    log_info "Starting Gunicorn WSGI server..."
    exec gunicorn core.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers "${GUNICORN_WORKERS:-4}" \
        --threads "${GUNICORN_THREADS:-2}" \
        --worker-class "${GUNICORN_WORKER_CLASS:-sync}" \
        --timeout "${GUNICORN_TIMEOUT:-120}" \
        --max-requests "${GUNICORN_MAX_REQUESTS:-1000}" \
        --max-requests-jitter "${GUNICORN_MAX_REQUESTS_JITTER:-50}" \
        --access-logfile - \
        --error-logfile - \
        --log-level "${GUNICORN_LOG_LEVEL:-info}" \
        --capture-output
fi
