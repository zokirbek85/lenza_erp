# Lenza ERP - Docker Production Deployment Guide

Complete guide for deploying Lenza ERP to a production VPS using Docker with blue/green zero-downtime updates.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Environment Variables](#environment-variables)
- [Operations](#operations)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [Security](#security)

---

## Overview

This deployment system provides:

✅ **Docker Containerization** - All services in isolated containers  
✅ **Blue/Green Deployment** - Zero-downtime updates  
✅ **Automatic SSL** - Let's Encrypt certificates with auto-renewal  
✅ **Nginx Reverse Proxy** - With rate limiting and security headers  
✅ **PostgreSQL Database** - Persistent data storage  
✅ **Redis Cache** - For Django Channels WebSocket support  
✅ **One-Click Operations** - Simple scripts for install, deploy, update  
✅ **Health Checks** - Automatic verification before traffic switching  

---

## Architecture

### Blue/Green Deployment Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS Server                          │
│                    (Ubuntu 24.04 LTS)                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Nginx (Host)                        │  │
│  │          Reverse Proxy + SSL Termination              │  │
│  │                                                        │  │
│  │  /etc/nginx/conf.d/active_upstream.conf               │  │
│  │  ↓ Routes traffic to active stack                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                   │
│          ┌──────────────┴──────────────┐                    │
│          ▼                             ▼                    │
│  ┌──────────────┐             ┌──────────────┐             │
│  │  Blue Stack  │             │ Green Stack  │             │
│  │ (lenza_blue) │             │(lenza_green) │             │
│  │              │             │              │             │
│  │  ┌─────────┐ │             │  ┌─────────┐ │             │
│  │  │Frontend │ │             │  │Frontend │ │             │
│  │  │React+Nx │ │             │  │React+Nx │ │             │
│  │  └─────────┘ │             │  └─────────┘ │             │
│  │  ┌─────────┐ │             │  ┌─────────┐ │             │
│  │  │Backend  │ │             │  │Backend  │ │             │
│  │  │Django   │ │             │  │Django   │ │             │
│  │  └─────────┘ │             │  └─────────┘ │             │
│  └──────────────┘             └──────────────┘             │
│          │                             │                    │
│          └──────────────┬──────────────┘                    │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │  Shared Services    │                        │
│              │                     │                        │
│              │  ┌───────────────┐  │                        │
│              │  │  PostgreSQL   │  │                        │
│              │  │  (lenza_db)   │  │                        │
│              │  └───────────────┘  │                        │
│              │  ┌───────────────┐  │                        │
│              │  │    Redis      │  │                        │
│              │  │ (lenza_redis) │  │                        │
│              │  └───────────────┘  │                        │
│              └─────────────────────┘                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               Docker Volumes                           │  │
│  │  • postgres_data (persistent database)                │  │
│  │  • redis_data (persistent cache)                      │  │
│  │  • lenza_media_shared (user uploads)                  │  │
│  │  • lenza_static_blue (static files)                   │  │
│  │  • lenza_static_green (static files)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Update Flow

1. **Current State**: Blue stack active, serving production traffic
2. **Deploy New Version**: Pull code, build green stack images
3. **Health Check**: Test green stack endpoints
4. **Switch Traffic**: Update Nginx to route to green stack
5. **Cleanup**: Stop blue stack (keep for quick rollback)
6. **Next Update**: Process reverses (green → blue)

### Service Communication

```
Browser → Nginx:443 (HTTPS)
         ↓
     Nginx routes based on path:
         • / → active_frontend (React SPA)
         • /api/ → active_backend (Django REST)
         • /admin/ → active_backend (Django Admin)
         • /ws/ → active_backend (WebSocket)
         • /static/ → Filesystem
         • /media/ → Filesystem
         ↓
     Backend → PostgreSQL:5432
     Backend → Redis:6379
```

---

## Prerequisites

### Server Requirements

- **Operating System**: Ubuntu 24.04 LTS (fresh install recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 40GB minimum, SSD recommended
- **Network**: Public IP address
- **Access**: Root SSH access

### Domain Configuration

- Domain name pointed to server IP (A record)
- Example: `erp.lenza.uz → 45.138.159.195`
- Wait for DNS propagation (check with `dig erp.lenza.uz`)

### Local Requirements (for initial setup)

- SSH client
- Git (optional, for cloning repository locally)

---

## Quick Start

### Three-Step Deployment

```bash
# Step 1: Prepare VPS (run as root on server)
wget https://raw.githubusercontent.com/zokirbek85/lenza_erp/main/server_install.sh
chmod +x server_install.sh
./server_install.sh

# Step 2: Initial deployment
cd /opt/lenza_erp
./deploy.sh

# Step 3: Updates (after initial deployment)
cd /opt/lenza_erp
./update.sh
```

That's it! Your application will be live at `https://your-domain.com`

---

## Detailed Setup

### Step 1: Server Installation

The `server_install.sh` script performs the following:

#### 1.1 System Update
```bash
apt update && apt upgrade -y
apt install -y curl git wget software-properties-common
```

#### 1.2 Docker Installation
```bash
# Install Docker Engine
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker service
systemctl enable docker
systemctl start docker
```

#### 1.3 Nginx Installation
```bash
apt install -y nginx
systemctl enable nginx
```

#### 1.4 Certbot (SSL) Installation
```bash
apt install -y certbot python3-certbot-nginx
```

#### 1.5 Firewall Configuration
```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
```

#### 1.6 Project Setup
```bash
# Clone repository
git clone https://github.com/zokirbek85/lenza_erp.git /opt/lenza_erp
cd /opt/lenza_erp

# Generate secure secrets
DJANGO_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Create .env from template
cp .env.example .env
sed -i "s/your-super-secret-key.../$DJANGO_SECRET/" .env
sed -i "s/your-secure-database-password.../$DB_PASSWORD/" .env
chmod 600 .env
```

#### 1.7 Nginx Configuration
```bash
# Copy Nginx configs
cp deploy/nginx/erp.lenza.uz.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/erp.lenza.uz.conf /etc/nginx/sites-enabled/

# Create active_upstream config
cp deploy/nginx/active_upstream.conf /etc/nginx/conf.d/

# Test and reload
nginx -t
systemctl reload nginx
```

#### 1.8 Docker Network
```bash
docker network create lenza_network
```

### Step 2: Initial Deployment

The `deploy.sh` script performs the following:

#### 2.1 Build Docker Images
```bash
docker compose -f deploy/docker-compose.blue.yml build --no-cache
```

#### 2.2 Start Database and Redis
```bash
docker compose -f deploy/docker-compose.blue.yml up -d db redis

# Wait for database to be ready
while ! docker exec lenza_db pg_isready -U lenza_user; do
    sleep 2
done
```

#### 2.3 Start Backend
```bash
docker compose -f deploy/docker-compose.blue.yml up -d backend_blue

# Migrations run automatically via docker-entrypoint.sh
# python manage.py migrate --noinput
# python manage.py collectstatic --noinput --clear
```

#### 2.4 Create Superuser
```bash
# Interactive prompt
docker compose -f deploy/docker-compose.blue.yml exec backend_blue \
    python manage.py createsuperuser
```

#### 2.5 Start Frontend
```bash
docker compose -f deploy/docker-compose.blue.yml up -d frontend_blue
```

#### 2.6 Copy Static Files
```bash
mkdir -p /var/www/lenza_erp/staticfiles
mkdir -p /var/www/lenza_erp/media

docker cp lenza_backend_blue:/app/staticfiles/. /var/www/lenza_erp/staticfiles/

chown -R www-data:www-data /var/www/lenza_erp
chmod -R 755 /var/www/lenza_erp
```

#### 2.7 Configure Nginx Active Upstream
```bash
cat > /etc/nginx/conf.d/active_upstream.conf << EOF
upstream active_backend {
    server lenza_backend_blue:8000;
}

upstream active_frontend {
    server lenza_frontend_blue:80;
}
EOF

nginx -t
systemctl reload nginx
```

#### 2.8 Request SSL Certificate
```bash
systemctl stop nginx

certbot certonly --standalone \
    --agree-tos \
    --email admin@lenza.uz \
    -d erp.lenza.uz

systemctl start nginx
```

#### 2.9 Setup Auto-Renewal
```bash
# Renewal hook
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Test renewal
certbot renew --dry-run
```

#### 2.10 Mark Active Stack
```bash
echo "blue" > deploy/active_stack
```

### Step 3: Zero-Downtime Updates

The `update.sh` script performs blue/green deployment:

#### 3.1 Detect Current Stack
```bash
CURRENT_STACK=$(cat deploy/active_stack)  # e.g., "blue"
TARGET_STACK="green"  # opposite of current
```

#### 3.2 Pull Latest Code
```bash
git pull origin main
```

#### 3.3 Build New Stack
```bash
docker compose -f deploy/docker-compose.green.yml build --pull
```

#### 3.4 Start New Stack
```bash
# Start backend (migrations run automatically)
docker compose -f deploy/docker-compose.green.yml up -d backend_green

# Start frontend
docker compose -f deploy/docker-compose.green.yml up -d frontend_green
```

#### 3.5 Health Checks
```bash
# Test new stack (30 attempts, 2s interval)
for i in {1..30}; do
    if docker exec lenza_backend_green \
        curl -f -s http://localhost:8000/api/health/; then
        echo "Health check passed"
        break
    fi
    sleep 2
done
```

#### 3.6 Switch Traffic
```bash
# Update Nginx to route to new stack
cat > /etc/nginx/conf.d/active_upstream.conf << EOF
upstream active_backend {
    server lenza_backend_green:8000;
}

upstream active_frontend {
    server lenza_frontend_green:80;
}
EOF

nginx -t
systemctl reload nginx
```

#### 3.7 Stop Old Stack
```bash
docker compose -f deploy/docker-compose.blue.yml stop backend_blue frontend_blue
```

#### 3.8 Update Stack Marker
```bash
echo "green" > deploy/active_stack
```

---

## Environment Variables

The `.env` file contains all configuration. Edit `/opt/lenza_erp/.env`:

### Django Configuration

```bash
# Security
DJANGO_SECRET_KEY=<auto-generated-50-char-secret>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=erp.lenza.uz,45.138.159.195,0.0.0.0,127.0.0.1,localhost

# CSRF and CORS
CSRF_TRUSTED_ORIGINS=https://erp.lenza.uz,http://45.138.159.195
CORS_ALLOWED_ORIGINS=https://erp.lenza.uz
```

### Database Configuration

```bash
POSTGRES_DB=lenza_erp_db
POSTGRES_USER=lenza_user
POSTGRES_PASSWORD=<auto-generated-32-char-password>
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

### Redis Configuration

```bash
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_URL=redis://redis:6379/0

# Django Channels
CHANNEL_LAYER_BACKEND=channels_redis.core.RedisChannelLayer
```

### Telegram Bot Configuration

```bash
TELEGRAM_BOT_TOKEN=8219609902:AAHtZkLxmZ4_E6fo_nwFDWkE2nnZyAxNA3M
TELEGRAM_GROUP_CHAT_ID=-1003006758530
```

### Gunicorn Configuration

```bash
GUNICORN_WORKERS=4
GUNICORN_THREADS=2
GUNICORN_TIMEOUT=120
```

### Frontend Configuration

```bash
VITE_API_URL=https://erp.lenza.uz
```

---

## Operations

### Viewing Logs

```bash
# Backend logs (active stack)
STACK=$(cat deploy/active_stack)
docker logs lenza_backend_${STACK} -f

# Frontend logs
docker logs lenza_frontend_${STACK} -f

# Database logs
docker logs lenza_db -f

# All logs for active stack
docker compose -f deploy/docker-compose.${STACK}.yml logs -f
```

### Checking Status

```bash
# All containers
docker ps

# Active stack only
STACK=$(cat deploy/active_stack)
docker ps --filter "label=lenza.stack=${STACK}"

# Container health
docker inspect --format='{{.State.Health.Status}}' lenza_backend_blue
```

### Accessing Containers

```bash
# Django shell
docker exec -it lenza_backend_blue python manage.py shell

# Database shell
docker exec -it lenza_db psql -U lenza_user -d lenza_erp_db

# Backend bash
docker exec -it lenza_backend_blue bash

# Frontend bash
docker exec -it lenza_frontend_blue sh
```

### Database Operations

```bash
# Create backup
docker exec lenza_db pg_dump -U lenza_user lenza_erp_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i lenza_db psql -U lenza_user lenza_erp_db < backup_20240115.sql

# Reset database (DANGER!)
docker exec lenza_db psql -U lenza_user -c "DROP DATABASE lenza_erp_db;"
docker exec lenza_db psql -U lenza_user -c "CREATE DATABASE lenza_erp_db;"
```

### Manual Stack Control

```bash
# Start specific stack
docker compose -f deploy/docker-compose.blue.yml up -d

# Stop specific stack
docker compose -f deploy/docker-compose.blue.yml down

# Rebuild and restart
docker compose -f deploy/docker-compose.blue.yml up -d --build
```

### SSL Certificate Management

```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew

# Test renewal
certbot renew --dry-run

# Force renew
certbot renew --force-renewal
```

---

## Troubleshooting

### Issue: Container Won't Start

```bash
# Check logs
docker logs lenza_backend_blue

# Check container state
docker inspect lenza_backend_blue | grep -A 20 "State"

# Restart container
docker restart lenza_backend_blue
```

### Issue: Database Connection Error

```bash
# Check if database is running
docker ps | grep lenza_db

# Check database logs
docker logs lenza_db

# Test connection from backend
docker exec lenza_backend_blue \
    python -c "import psycopg; psycopg.connect('dbname=lenza_erp_db user=lenza_user host=db')"

# Verify environment variables
docker exec lenza_backend_blue env | grep POSTGRES
```

### Issue: 502 Bad Gateway

**Causes:**
- Backend container not running
- Backend not listening on port 8000
- Nginx upstream configuration incorrect

**Solutions:**
```bash
# Check backend status
docker ps | grep backend

# Check backend port
docker exec lenza_backend_blue netstat -tlnp | grep 8000

# Test backend directly
docker exec lenza_backend_blue curl http://localhost:8000/api/health/

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Verify upstream config
cat /etc/nginx/conf.d/active_upstream.conf
```

### Issue: Health Check Fails

```bash
# Check if health endpoint exists
docker exec lenza_backend_blue curl -v http://localhost:8000/api/health/

# Add health check endpoint if missing
# Edit backend/core/urls.py and add:
# path('api/health/', lambda r: JsonResponse({'status': 'ok'}))

# Check backend logs for errors
docker logs lenza_backend_blue --tail 100
```

### Issue: SSL Certificate Error

```bash
# Check certificate status
certbot certificates

# Check Nginx SSL config
nginx -t

# Verify domain points to server
dig erp.lenza.uz +short

# Re-request certificate
certbot certonly --standalone -d erp.lenza.uz --force-renewal
```

### Issue: Static Files Not Loading

```bash
# Check static files directory
ls -la /var/www/lenza_erp/staticfiles/

# Recollect static files
docker exec lenza_backend_blue python manage.py collectstatic --noinput --clear

# Copy to Nginx directory
docker cp lenza_backend_blue:/app/staticfiles/. /var/www/lenza_erp/staticfiles/

# Fix permissions
chown -R www-data:www-data /var/www/lenza_erp
chmod -R 755 /var/www/lenza_erp
```

### Issue: Update Script Fails

```bash
# Check current stack
cat deploy/active_stack

# Manually run health check
STACK=$(cat deploy/active_stack)
docker exec lenza_backend_${STACK} curl http://localhost:8000/api/health/

# Check for conflicts
docker ps --all | grep lenza

# Force cleanup
docker compose -f deploy/docker-compose.blue.yml down
docker compose -f deploy/docker-compose.green.yml down
docker system prune -f
```

### Issue: Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system df
docker system prune -a --volumes

# Clean old images
docker image prune -a

# Remove unused volumes
docker volume prune
```

---

## Maintenance

### Regular Backups

Create a backup script `/root/backup_lenza.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup database
docker exec lenza_db pg_dump -U lenza_user lenza_erp_db | \
    gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup media files
tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" -C /var/www/lenza_erp media/

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Schedule with cron:
```bash
# Daily backup at 2 AM
crontab -e
# Add: 0 2 * * * /root/backup_lenza.sh >> /var/log/lenza_backup.log 2>&1
```

### Monitoring

```bash
# CPU and Memory usage
docker stats

# Disk usage by container
docker ps -q | xargs docker inspect --format='{{.Name}} {{.SizeRootFs}}' | sort -k 2 -h

# Network connections
docker exec lenza_backend_blue netstat -an | grep :8000

# Database connections
docker exec lenza_db psql -U lenza_user -d lenza_erp_db \
    -c "SELECT count(*) FROM pg_stat_activity;"
```

### Log Rotation

Configure Docker log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
systemctl restart docker
```

### Updating System Packages

```bash
# Update Ubuntu packages
apt update && apt upgrade -y

# Restart containers after kernel updates
docker compose -f deploy/docker-compose.$(cat deploy/active_stack).yml restart
```

---

## Security

### Firewall Rules

```bash
# Check UFW status
ufw status verbose

# Only allow necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### SSH Hardening

Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
systemctl restart sshd
```

### Secret Management

```bash
# Secure .env file
chmod 600 /opt/lenza_erp/.env
chown root:root /opt/lenza_erp/.env

# Never commit .env to Git
echo ".env" >> /opt/lenza_erp/.gitignore
```

### Docker Security

```bash
# Run containers as non-root (already configured in Dockerfile)
# Check user
docker exec lenza_backend_blue whoami  # Should output: django

# Limit container resources
# Edit docker-compose files to add:
# deploy:
#   resources:
#     limits:
#       cpus: '1.0'
#       memory: 1G
```

### Database Security

```bash
# Use strong password (auto-generated by server_install.sh)
# Restrict database access to Docker network only (already configured)
# Regular backups (see Maintenance section)

# Check database connections
docker exec lenza_db psql -U lenza_user -d lenza_erp_db \
    -c "SELECT datname, usename, client_addr FROM pg_stat_activity;"
```

### SSL/TLS

```bash
# Use strong ciphers (already configured in Nginx)
# HTTPS only (HTTP redirects to HTTPS)
# HSTS enabled
# Check SSL rating: https://www.ssllabs.com/ssltest/

# Verify SSL configuration
openssl s_client -connect erp.lenza.uz:443 -tls1_2
```

---

## Rollback Procedure

If you need to rollback to the previous stack:

```bash
# 1. Determine previous stack
CURRENT=$(cat deploy/active_stack)
if [ "$CURRENT" = "blue" ]; then
    PREVIOUS="green"
else
    PREVIOUS="blue"
fi

# 2. Start previous stack
docker compose -f deploy/docker-compose.${PREVIOUS}.yml up -d

# 3. Wait for health check
sleep 10
docker exec lenza_backend_${PREVIOUS} curl http://localhost:8000/api/health/

# 4. Switch Nginx
cat > /etc/nginx/conf.d/active_upstream.conf << EOF
upstream active_backend {
    server lenza_backend_${PREVIOUS}:8000;
}

upstream active_frontend {
    server lenza_frontend_${PREVIOUS}:80;
}
EOF

# 5. Reload Nginx
nginx -t
systemctl reload nginx

# 6. Update active stack marker
echo "$PREVIOUS" > deploy/active_stack

# 7. Stop current stack
docker compose -f deploy/docker-compose.${CURRENT}.yml stop backend_${CURRENT} frontend_${CURRENT}

echo "Rollback complete: $CURRENT -> $PREVIOUS"
```

---

## Useful Commands Reference

### Docker

```bash
# View all containers
docker ps -a

# View images
docker images

# View volumes
docker volume ls

# View networks
docker network ls

# Clean everything
docker system prune -a --volumes

# Export/Import images
docker save lenza_backend:latest | gzip > backend.tar.gz
docker load < backend.tar.gz
```

### Django Management

```bash
# Create superuser
docker exec -it lenza_backend_blue python manage.py createsuperuser

# Run migrations
docker exec lenza_backend_blue python manage.py migrate

# Create migrations
docker exec lenza_backend_blue python manage.py makemigrations

# Collect static
docker exec lenza_backend_blue python manage.py collectstatic --noinput

# Django shell
docker exec -it lenza_backend_blue python manage.py shell

# Database shell
docker exec -it lenza_backend_blue python manage.py dbshell
```

### Nginx

```bash
# Test configuration
nginx -t

# Reload configuration
systemctl reload nginx

# Restart Nginx
systemctl restart nginx

# View error log
tail -f /var/log/nginx/error.log

# View access log
tail -f /var/log/nginx/access.log
```

---

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/zokirbek85/lenza_erp/issues
- **Documentation**: https://github.com/zokirbek85/lenza_erp/blob/main/README.md
- **Email**: admin@lenza.uz

---

## License

Lenza ERP © 2024. All rights reserved.

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
