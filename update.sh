#!/usr/bin/env bash
# ========================================
# Lenza ERP - Zero-Downtime Update Script
# Blue/Green Deployment with Health Checks
# Automatically switches between blue and green stacks
# ========================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/opt/lenza_erp"
ACTIVE_STACK_FILE="$PROJECT_DIR/deploy/active_stack"
HEALTH_CHECK_URL="http://localhost:8000/api/health/"
MAX_HEALTH_ATTEMPTS=30
HEALTH_CHECK_INTERVAL=2

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}━━━━ $1 ━━━━${NC}\n"
}

# Error handler
error_handler() {
    log_error "Deployment failed at line $1"
    log_error "Keeping current stack active: $CURRENT_STACK"
    exit 1
}

trap 'error_handler $LINENO' ERR

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

log_step "Lenza ERP - Zero-Downtime Update"

# Determine current active stack
if [ -f "$ACTIVE_STACK_FILE" ]; then
    CURRENT_STACK=$(cat "$ACTIVE_STACK_FILE")
else
    log_warn "No active stack file found, assuming blue"
    CURRENT_STACK="blue"
    echo "blue" > "$ACTIVE_STACK_FILE"
fi

# Determine target stack (opposite of current)
if [ "$CURRENT_STACK" = "blue" ]; then
    TARGET_STACK="green"
else
    TARGET_STACK="blue"
fi

log_info "Current active stack: ${CYAN}$CURRENT_STACK${NC}"
log_info "Target deployment stack: ${CYAN}$TARGET_STACK${NC}"

log_step "1. Pulling Latest Code"

log_info "Fetching latest changes from Git..."
git fetch origin main
git pull origin main

log_step "2. Loading Environment Variables"

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env file not found"
    exit 1
fi

# Source environment file
set -a
source .env
set +a

# Set domain (should match deploy.sh)
DOMAIN="${DOMAIN:-erp.lenza.uz}"

log_info "Environment loaded"

log_step "3. Building New Stack Images"

log_info "Building $TARGET_STACK stack (this may take a few minutes)..."
docker compose -f "deploy/docker-compose.${TARGET_STACK}.yml" build --pull

log_step "4. Ensuring Shared Services Are Running"

# Ensure db and redis are running (they're shared)
log_info "Checking database and Redis status..."

if ! docker ps --format '{{.Names}}' | grep -q "lenza_db"; then
    log_info "Starting database..."
    docker compose -f "deploy/docker-compose.${TARGET_STACK}.yml" up -d db
    sleep 10
fi

if ! docker ps --format '{{.Names}}' | grep -q "lenza_redis"; then
    log_info "Starting Redis..."
    docker compose -f "deploy/docker-compose.${TARGET_STACK}.yml" up -d redis
    sleep 5
fi

# Wait for database
log_info "Waiting for database to be ready..."
max_attempts=30
attempt=0
while ! docker exec lenza_db pg_isready -U "${POSTGRES_USER}" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        log_error "Database is not ready"
        exit 1
    fi
    sleep 2
done

log_info "Database is ready"

log_step "5. Starting Target Stack (${TARGET_STACK})"

log_info "Starting backend_${TARGET_STACK}..."
docker compose -f "deploy/docker-compose.${TARGET_STACK}.yml" up -d backend_${TARGET_STACK}

log_info "Waiting for backend to initialize..."
sleep 10

# Database migrations are handled automatically by entrypoint
log_info "Backend started (migrations run automatically)"

log_step "Running Database Migrations (if needed)"

log_info "Checking for new migrations..."

# Check for pending migrations inside backend container
if docker exec "$BACKEND_CONTAINER" python manage.py showmigrations --plan | grep "\[ \]" >/dev/null 2>&1; then
    log_info "New migrations detected — applying..."
    docker exec "$BACKEND_CONTAINER" python manage.py migrate --noinput
    log_info "${GREEN}✓ Migrations applied successfully${NC}"
else
    log_info "${YELLOW}No new migrations found — skipping${NC}"
fi


log_info "Starting frontend_${TARGET_STACK}..."
docker compose -f "deploy/docker-compose.${TARGET_STACK}.yml" up -d frontend_${TARGET_STACK}

sleep 5

log_step "6. Running Health Checks on Target Stack"

# Get backend container port
BACKEND_CONTAINER="lenza_backend_${TARGET_STACK}"

log_info "Performing health checks on $TARGET_STACK stack..."
attempt=0
healthy=false

while [ $attempt -lt $MAX_HEALTH_ATTEMPTS ]; do
    attempt=$((attempt + 1))
    
    # Health check using docker exec
    if docker exec "$BACKEND_CONTAINER" curl -f -s http://127.0.0.1:8000/api/health/ -H "Host: erp.lenza.uz" > /dev/null 2>&1; then
        log_info "Health check passed! ($attempt/$MAX_HEALTH_ATTEMPTS)"
        healthy=true
        break
    else
        log_warn "Health check attempt $attempt/$MAX_HEALTH_ATTEMPTS failed, retrying..."
        sleep $HEALTH_CHECK_INTERVAL
    fi
done

if [ "$healthy" = false ]; then
    log_error "Health checks failed for $TARGET_STACK stack"
    log_error "Rolling back - stopping $TARGET_STACK stack"
    docker compose -f "deploy/docker-compose.${TARGET_STACK}.yml" stop backend_${TARGET_STACK} frontend_${TARGET_STACK}
    exit 1
fi

log_info "${GREEN}✓ Target stack is healthy${NC}"

log_step "7. Copying Static and Media Files"

log_info "Copying static files from $TARGET_STACK stack..."
docker cp "$BACKEND_CONTAINER:/app/staticfiles/." /var/www/lenza_erp/staticfiles/ 2>/dev/null || true

# Media files are shared, no need to copy
chown -R www-data:www-data /var/www/lenza_erp
chmod -R 755 /var/www/lenza_erp

log_step "8. Switching Nginx Upstream"

log_info "Updating Nginx to route traffic to $TARGET_STACK stack..."

# Determine port based on stack (blue: 8000/3000, green: 8001/3001)
if [ "$TARGET_STACK" = "blue" ]; then
    BACKEND_PORT=8000
    FRONTEND_PORT=3000
else
    BACKEND_PORT=8001
    FRONTEND_PORT=3001
fi

# Update main Nginx configuration with new upstream
cat > /etc/nginx/conf.d/lenza_erp.conf << EOF
# Active stack: ${TARGET_STACK}
upstream active_backend {
    server 127.0.0.1:${BACKEND_PORT};
}

upstream active_frontend {
    server 127.0.0.1:${FRONTEND_PORT};
}

server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ACME challenge endpoint for Certbot renewals
    location /.well-known/acme-challenge/ {
        alias /var/www/letsencrypt/.well-known/acme-challenge/;
    }

    location /api/ {
        proxy_pass http://active_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    location /admin/ {
        proxy_pass http://active_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /static/ {
        alias /var/www/lenza_erp/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/lenza_erp/media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://active_frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Remove old active_upstream.conf if it exists
rm -f /etc/nginx/conf.d/active_upstream.conf

# Test Nginx configuration
log_info "Testing Nginx configuration..."
nginx -t

# Reload Nginx gracefully
log_info "Reloading Nginx..."
systemctl reload nginx

log_info "${GREEN}✓ Nginx now routing to $TARGET_STACK stack${NC}"

# Wait a moment for traffic to shift
sleep 3

log_step "9. Verifying New Stack Under Load"

log_info "Running final health check on active stack..."
if docker exec "$BACKEND_CONTAINER" curl -f -s http://127.0.0.1:8000/api/health/ -H "Host: erp.lenza.uz" > /dev/null 2>&1; then
    log_info "${GREEN}✓ Final health check passed${NC}"
else
    log_error "Final health check failed!"
    log_error "Manual intervention required - check logs:"
    log_error "  docker logs $BACKEND_CONTAINER"
    exit 1
fi

log_step "10. Stopping Old Stack (${CURRENT_STACK})"

log_info "Stopping old $CURRENT_STACK stack containers..."

# Stop old backend and frontend (leave db and redis running)
docker compose -f "deploy/docker-compose.${CURRENT_STACK}.yml" stop backend_${CURRENT_STACK} frontend_${CURRENT_STACK}

log_info "Old stack stopped"

log_step "11. Cleaning Up Old Images"

log_info "Removing unused Docker images..."
docker image prune -f

log_step "12. Updating Active Stack Marker"

echo "$TARGET_STACK" > "$ACTIVE_STACK_FILE"
log_info "Active stack updated to: $TARGET_STACK"

log_step "13. Deployment Complete!"

# Get container status
BACKEND_STATUS=$(docker inspect -f '{{.State.Status}}' "lenza_backend_${TARGET_STACK}" 2>/dev/null || echo "unknown")
FRONTEND_STATUS=$(docker inspect -f '{{.State.Status}}' "lenza_frontend_${TARGET_STACK}" 2>/dev/null || echo "unknown")

cat << EOF

${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${GREEN}✓ Zero-Downtime Update Completed Successfully!${NC}
${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BLUE}Update Summary:${NC}
  • Previous stack: ${RED}$CURRENT_STACK${NC} (now stopped)
  • New active stack: ${GREEN}$TARGET_STACK${NC}
  • Update completed at: $(date)

${BLUE}Container Status:${NC}
  • Backend ($TARGET_STACK): $BACKEND_STATUS
  • Frontend ($TARGET_STACK): $FRONTEND_STATUS

${YELLOW}Active Services:${NC}
  • Frontend: https://erp.lenza.uz
  • API: https://erp.lenza.uz/api/
  • Admin: https://erp.lenza.uz/admin/

${YELLOW}Monitoring Commands:${NC}
  • View logs: ${BLUE}docker logs lenza_backend_${TARGET_STACK} -f${NC}
  • Check status: ${BLUE}docker ps --filter "label=lenza.stack=${TARGET_STACK}"${NC}
  • Test health: ${BLUE}curl https://erp.lenza.uz/api/health/${NC}

${YELLOW}Rollback (if needed):${NC}
  • Start old stack: ${BLUE}docker compose -f deploy/docker-compose.${CURRENT_STACK}.yml up -d${NC}
  • Switch Nginx back: ${BLUE}# Edit /etc/nginx/conf.d/active_upstream.conf${NC}
  • Reload Nginx: ${BLUE}systemctl reload nginx${NC}

${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${CYAN}The old $CURRENT_STACK stack has been stopped but not removed.${NC}
${CYAN}If you need to rollback, you can quickly restart it.${NC}

${GREEN}Deployment completed successfully at: $(date)${NC}

EOF

# Save update info
cat >> /root/lenza_updates.log << EOF
========================================
Update: $(date)
From: $CURRENT_STACK
To: $TARGET_STACK
Status: SUCCESS
========================================
EOF

log_info "Update logged to /root/lenza_updates.log"

exit 0
