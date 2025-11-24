#!/usr/bin/env bash
# ========================================
# Lenza ERP - Initial Deployment Script
# Deploys the application for the first time
# Run after server_install.sh
# ========================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/opt/lenza_erp"
DOMAIN="erp.lenza.uz"
EMAIL="admin@lenza.uz"  # Change this to your email for Let's Encrypt
INITIAL_STACK="blue"
ENV_FILE_PRIMARY="$PROJECT_DIR/.env"
ENV_FILE_FALLBACK="$PROJECT_DIR/deploy/.env"

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
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

log_step "1. Loading Environment Variables"

# Source environment file with fallback
if [ -f "$ENV_FILE_PRIMARY" ]; then
    ENV_FILE="$ENV_FILE_PRIMARY"
elif [ -f "$ENV_FILE_FALLBACK" ]; then
    ENV_FILE="$ENV_FILE_FALLBACK"
else
    log_error "Environment file not found in $ENV_FILE_PRIMARY or $ENV_FILE_FALLBACK"
    exit 1
fi

log_info "Using env file: $ENV_FILE"
set -a
source "$ENV_FILE"
set +a

log_info "Environment loaded"

COMPOSE_FILE="deploy/docker-compose.${INITIAL_STACK}.yml"

log_step "2. Building Docker Images"

# Build images for initial stack (blue)
log_info "Building $INITIAL_STACK stack images..."
docker compose -f "$COMPOSE_FILE" build --no-cache

log_step "3. Starting Database and Redis"

# Start shared services first
log_info "Starting database and Redis..."
docker compose -f "$COMPOSE_FILE" up -d db redis

# Wait for database to be ready
log_info "Waiting for database to be ready..."
sleep 10

# Check database health
max_attempts=30
attempt=0
while ! docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U "${POSTGRES_USER}" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        log_error "Database failed to start"
        exit 1
    fi
    log_info "Waiting for database... ($attempt/$max_attempts)"
    sleep 2
done

log_info "Database is ready!"

log_step "4. Running Database Migrations"

# Start backend temporarily to run migrations
log_info "Starting backend to run migrations..."
docker compose -f "$COMPOSE_FILE" up -d backend_${INITIAL_STACK}

# Wait for backend to start
sleep 5

# Run migrations explicitly with required env variables to avoid localhost fallback
log_info "Running Django migrations..."
docker compose -f "$COMPOSE_FILE" exec -T backend_${INITIAL_STACK} /bin/sh -c "export POSTGRES_HOST=${POSTGRES_HOST:-db}; export POSTGRES_PORT=${POSTGRES_PORT:-5432}; python manage.py migrate --noinput"

log_step "5. Creating Django Superuser"

log_warn "You can create a superuser now or skip and do it later"
read -p "Create superuser now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose -f "$COMPOSE_FILE" exec -T backend_${INITIAL_STACK} python manage.py createsuperuser
fi

log_step "6. Starting Frontend"

log_info "Starting frontend..."
docker compose -f "$COMPOSE_FILE" up -d frontend_${INITIAL_STACK}

# Wait for services to be ready
sleep 5

log_step "7. Copying Static Files to Nginx Directory"

# Create volume mount point
log_info "Copying static files..."
docker cp "lenza_backend_${INITIAL_STACK}:/app/staticfiles/." /var/www/lenza_erp/staticfiles/ 2>/dev/null || log_warn "No static files to copy yet"
docker cp "lenza_backend_${INITIAL_STACK}:/app/media/." /var/www/lenza_erp/media/ 2>/dev/null || log_warn "No media files to copy yet"

# Set permissions
chown -R www-data:www-data /var/www/lenza_erp
chmod -R 755 /var/www/lenza_erp

log_step "8. Configuring Nginx"

# Prepare ACME webroot and Nginx config for Certbot
mkdir -p /var/www/letsencrypt/.well-known/acme-challenge
cat > /etc/nginx/conf.d/lenza_erp.conf << EOF
# Active stack: ${INITIAL_STACK}
upstream active_backend {
    server 127.0.0.1:8000;
}

upstream active_frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name ${DOMAIN};

    # ACME challenge endpoint for Certbot
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

    location / {
        proxy_pass http://active_frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Test Nginx configuration
log_info "Testing Nginx configuration..."
nginx -t

# Start Nginx
log_info "Starting Nginx..."
systemctl start nginx
systemctl enable nginx

log_step "9. Requesting SSL Certificate"

log_info "Requesting SSL certificate for $DOMAIN..."

# Use webroot mode to avoid TTY and port conflicts
certbot certonly --webroot \
    --webroot-path /var/www/letsencrypt \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" || {
        log_warn "SSL certificate request failed. You can run certbot manually later."
        log_warn "Command: certbot --nginx -d $DOMAIN"
    }

# If certificate was created, switch to SSL-enabled config
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
    cat > /etc/nginx/conf.d/lenza_erp.conf << EOF
# Active stack: ${INITIAL_STACK}
upstream active_backend {
    server 127.0.0.1:8000;
}

upstream active_frontend {
    server 127.0.0.1:3000;
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
fi

# Test Nginx with SSL
nginx -t && systemctl reload nginx

log_step "10. Setting Up Automatic SSL Renewal"

# Create certbot renewal hook to reload nginx
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Test renewal (dry run)
log_info "Testing SSL certificate renewal..."
certbot renew --dry-run || log_warn "SSL renewal test failed"

log_step "11. Saving Active Stack State"

# Save which stack is active
echo "$INITIAL_STACK" > "$PROJECT_DIR/deploy/active_stack"

log_step "12. Deployment Complete!"

# Get container status
BACKEND_STATUS=$(docker inspect -f '{{.State.Status}}' "lenza_backend_${INITIAL_STACK}" 2>/dev/null || echo "not found")
FRONTEND_STATUS=$(docker inspect -f '{{.State.Status}}' "lenza_frontend_${INITIAL_STACK}" 2>/dev/null || echo "not found")
DB_STATUS=$(docker inspect -f '{{.State.Status}}' "lenza_db" 2>/dev/null || echo "not found")

cat << EOF

${GREEN}============================================================${NC}
${GREEN}== Initial Deployment Completed Successfully!              ==${NC}
${GREEN}============================================================${NC}

${BLUE}Deployment Summary:${NC}
  - Active stack: ${INITIAL_STACK}
  - Domain: https://${DOMAIN}
  - API: https://${DOMAIN}/api/
  - Admin: https://${DOMAIN}/admin/

${BLUE}Container Status:${NC}
  - Database: ${DB_STATUS}
  - Backend (${INITIAL_STACK}): ${BACKEND_STATUS}
  - Frontend (${INITIAL_STACK}): ${FRONTEND_STATUS}

${YELLOW}Access URLs:${NC}
  - Frontend: ${GREEN}https://${DOMAIN}${NC}
  - API: ${GREEN}https://${DOMAIN}/api/${NC}
  - Admin Panel: ${GREEN}https://${DOMAIN}/admin/${NC}
  - Health Check: ${GREEN}https://${DOMAIN}/api/health/${NC}

${YELLOW}Useful Commands:${NC}
  - View logs: ${BLUE}docker compose -f deploy/docker-compose.${INITIAL_STACK}.yml logs -f${NC}
  - View backend logs: ${BLUE}docker logs lenza_backend_${INITIAL_STACK} -f${NC}
  - View frontend logs: ${BLUE}docker logs lenza_frontend_${INITIAL_STACK} -f${NC}
  - Restart services: ${BLUE}docker compose -f deploy/docker-compose.${INITIAL_STACK}.yml restart${NC}
  - Check status: ${BLUE}docker compose -f deploy/docker-compose.${INITIAL_STACK}.yml ps${NC}

${YELLOW}Update Application:${NC}
  - Run: ${BLUE}./update.sh${NC} (zero-downtime blue/green deployment)

${YELLOW}Backup Database:${NC}
  - ${BLUE}docker exec lenza_db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$(date +%Y%m%d).sql${NC}

${GREEN}============================================================${NC}

${YELLOW}Next Steps:${NC}
  1. Test the application at https://${DOMAIN}
  2. Login to admin panel at https://${DOMAIN}/admin/
  3. Set up regular backups
  4. Configure monitoring (optional)
  5. Review firewall rules: ${BLUE}ufw status${NC}

${GREEN}Deployment completed at: $(date)${NC}

EOF

# Save deployment info
cat > /root/lenza_deployment_info.txt << EOF
Lenza ERP Deployment Information
================================
Deployment Date: $(date)
Domain: ${DOMAIN}
Active Stack: ${INITIAL_STACK}
Project Directory: ${PROJECT_DIR}

Container Names:
- Database: lenza_db
- Backend: lenza_backend_${INITIAL_STACK}
- Frontend: lenza_frontend_${INITIAL_STACK}
- Redis: lenza_redis

Access:
- Frontend: https://${DOMAIN}
- API: https://${DOMAIN}/api/
- Admin: https://${DOMAIN}/admin/

Logs:
- Backend: docker logs lenza_backend_${INITIAL_STACK} -f
- Frontend: docker logs lenza_frontend_${INITIAL_STACK} -f
- Nginx: tail -f /var/log/nginx/error.log

Update:
- ./update.sh (zero-downtime deployment)

Backup:
- docker exec lenza_db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup.sql
EOF

log_info "Deployment info saved to /root/lenza_deployment_info.txt"

exit 0
