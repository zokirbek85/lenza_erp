# Lenza ERP - Complete Docker Deployment Guide

This guide provides comprehensive instructions for Dockerizing and deploying Lenza ERP (Django + React + Celery + PostgreSQL) to a production VPS with automated CI/CD.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Docker Architecture](#docker-architecture)
3. [Local Development with Docker](#local-development-with-docker)
4. [Production Deployment](#production-deployment)
5. [GitHub Secrets Configuration](#github-secrets-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## 🎯 Overview

### What's Included

✅ **Backend Dockerfile** - Python 3.11, Gunicorn, system dependencies  
✅ **Frontend Dockerfile** - Node 20, multi-stage build with Nginx  
✅ **Docker Compose** - Complete orchestration (backend, frontend, celery, postgres)  
✅ **Entrypoint Script** - Migrations, collectstatic, Gunicorn startup  
✅ **Environment Files** - `.env.backend` and `.env.db`  
✅ **Nginx Reverse Proxy** - SSL-ready configuration  
✅ **GitHub Actions** - Auto-deploy on push to main  
✅ **VPS Deployment Guide** - Step-by-step instructions  

### Technology Stack

- **Backend:** Django 5.1, DRF, Gunicorn
- **Frontend:** React 19, Vite, Nginx
- **Database:** PostgreSQL 15
- **Task Queue:** Celery
- **Web Server:** Nginx (reverse proxy)
- **Container Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions

---

## 🏗️ Docker Architecture

### Container Services

```
┌─────────────────────────────────────────────┐
│              VPS (Ubuntu 24.04)             │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │   Nginx (Host - Reverse Proxy)     │   │
│  │   Port 80/443 → SSL Termination    │   │
│  └────────────┬─────────────┬─────────┘   │
│               │             │               │
│       ┌───────▼─────┐ ┌────▼─────────┐    │
│       │  Frontend   │ │   Backend    │    │
│       │  (Nginx)    │ │  (Gunicorn)  │    │
│       │  Port 3000  │ │  Port 8000   │    │
│       └─────────────┘ └──────┬───────┘    │
│                              │             │
│       ┌─────────────┐  ┌─────▼─────┐      │
│       │   Celery    │  │ PostgreSQL│      │
│       │   Worker    │  │  Port 5432│      │
│       └─────────────┘  └───────────┘      │
└─────────────────────────────────────────────┘
```

### File Structure

```
lenza_erp/
├── backend/
│   ├── Dockerfile              # Backend container definition
│   ├── entrypoint.sh           # Startup script
│   ├── requirements.txt        # Python dependencies
│   └── ...
├── frontend/
│   ├── Dockerfile              # Frontend container definition
│   ├── nginx.conf              # Internal Nginx config
│   ├── package.json            # Node dependencies
│   └── ...
├── nginx/
│   └── erp.lenza.uz            # VPS Nginx reverse proxy config
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD
├── docker-compose.yml          # Container orchestration
├── .env.backend                # Backend environment variables
├── .env.db                     # Database credentials
├── VPS_DEPLOY.md               # VPS deployment guide
└── DOCKER_DEPLOY_GUIDE.md      # This file
```

---

## 💻 Local Development with Docker

### Prerequisites

- Docker Desktop installed
- Git
- Text editor

### Setup Steps

1. **Clone Repository**

```bash
git clone https://github.com/zokirbek85/lenza_erp.git
cd lenza_erp
```

2. **Configure Environment Variables**

Create `.env.backend`:
```env
ENV=development
DEBUG=1
DJANGO_SECRET_KEY=dev-secret-key-change-in-production
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:3000

USE_POSTGRES=true
POSTGRES_DB=lenza_db
POSTGRES_USER=lenza_user
POSTGRES_PASSWORD=dev_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

Create `.env.db`:
```env
POSTGRES_USER=lenza_user
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=lenza_db
```

3. **Build and Start Containers**

```bash
docker compose build
docker compose up -d
```

4. **Create Superuser**

```bash
docker compose exec backend python manage.py createsuperuser
```

5. **Access Application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/

### Development Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop all containers
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Access backend shell
docker compose exec backend python manage.py shell

# Run migrations
docker compose exec backend python manage.py migrate

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput
```

---

## 🚀 Production Deployment

### Server Requirements

- **OS:** Ubuntu 24.04 (recommended) or Ubuntu 22.04
- **RAM:** Minimum 2GB (4GB recommended)
- **Storage:** 20GB+ SSD
- **CPU:** 2+ cores
- **Domain:** Configured and pointing to server IP

### VPS Information

- **Domain:** erp.lenza.uz
- **IP Address:** 45.138.159.195
- **SSH User:** root

### Deployment Steps

Follow the comprehensive guide in [VPS_DEPLOY.md](./VPS_DEPLOY.md) which includes:

1. ✅ Server setup and security
2. ✅ Docker and Docker Compose installation
3. ✅ Repository cloning
4. ✅ Environment configuration
5. ✅ Container deployment
6. ✅ Nginx reverse proxy setup
7. ✅ SSL certificate configuration
8. ✅ Superuser creation
9. ✅ Verification steps

### Quick Deploy Command

Once VPS is configured, deploy with:

```bash
ssh root@45.138.159.195
cd /opt/lenza_erp
git pull origin main
docker compose down
docker compose up -d --build
```

---

## 🔐 GitHub Secrets Configuration

To enable automated deployments via GitHub Actions, configure these secrets in your repository.

### Adding Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

### Required Secrets

#### 1. VPS_HOST

- **Name:** `VPS_HOST`
- **Value:** `45.138.159.195`
- **Description:** IP address of your VPS

#### 2. VPS_USER

- **Name:** `VPS_USER`
- **Value:** `root`
- **Description:** SSH username for VPS access

#### 3. VPS_SSH_KEY

- **Name:** `VPS_SSH_KEY`
- **Value:** Your private SSH key
- **Description:** Private key for SSH authentication

**How to generate SSH key:**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions@lenza.uz" -f ~/.ssh/lenza_deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/lenza_deploy.pub root@45.138.159.195

# Get private key content for GitHub secret
cat ~/.ssh/lenza_deploy
```

Copy the entire output (including `-----BEGIN` and `-----END` lines) and paste as the `VPS_SSH_KEY` secret value.

### Verify Secrets

After adding all secrets, you should see:

```
VPS_HOST        ✓ Added
VPS_USER        ✓ Added
VPS_SSH_KEY     ✓ Added
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The deployment workflow (`.github/workflows/deploy.yml`) automatically:

1. ✅ Triggers on push to `main` branch
2. ✅ Connects to VPS via SSH
3. ✅ Pulls latest code
4. ✅ Stops running containers
5. ✅ Rebuilds Docker images
6. ✅ Starts new containers
7. ✅ Cleans up old images
8. ✅ Reports deployment status

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to VPS** workflow
3. Click **Run workflow**
4. Choose branch (usually `main`)
5. Click **Run workflow** button

### Deployment Process

```
GitHub Push → Workflow Triggered → SSH to VPS → Pull Code
    ↓
Git Pull → Docker Compose Down → Docker Compose Build
    ↓
Docker Compose Up → Health Check → Cleanup → Success
```

### Viewing Deployment Logs

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. Expand **Deploy to VPS via SSH** step
4. View detailed logs

---

## 🐛 Troubleshooting

### Common Issues

#### 1. GitHub Actions: Permission Denied

**Error:** `Permission denied (publickey)`

**Solution:**
```bash
# Verify SSH key is added to VPS
ssh root@45.138.159.195

# Check authorized_keys
cat ~/.ssh/authorized_keys

# Re-add SSH key if needed
ssh-copy-id -i ~/.ssh/lenza_deploy.pub root@45.138.159.195
```

#### 2. Container Won't Start

**Error:** `container exited with code 1`

**Solution:**
```bash
# Check logs
docker compose logs backend

# Common causes:
# - Database not ready: Wait and restart
# - Missing environment variables: Check .env files
# - Port conflict: Check if ports 8000/3000 are free
```

#### 3. Database Connection Error

**Error:** `FATAL: password authentication failed`

**Solution:**
```bash
# Verify credentials match in both files
cat .env.backend | grep POSTGRES
cat .env.db | grep POSTGRES

# Ensure database is healthy
docker compose ps db
docker compose logs db
```

#### 4. Nginx 502 Bad Gateway

**Error:** Backend not responding

**Solution:**
```bash
# Check backend is running
docker compose ps backend

# Check backend logs
docker compose logs backend

# Verify backend responds
curl http://localhost:8000/api/

# Check Nginx config
nginx -t
```

#### 5. Frontend Shows Blank Page

**Possible causes:**
- API URL misconfigured
- CORS issues
- Build errors

**Solution:**
```bash
# Check frontend logs
docker compose logs frontend

# Check browser console for errors

# Verify API URL in frontend config
# Should point to: https://erp.lenza.uz/api/
```

#### 6. SSL Certificate Issues

**Error:** Certificate not valid

**Solution:**
```bash
# Renew certificate
certbot renew

# Check certificate status
certbot certificates

# Force renewal
certbot renew --force-renewal

# Restart Nginx
systemctl restart nginx
```

### Debug Commands

```bash
# Check all container status
docker compose ps

# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f db

# Check container resource usage
docker stats

# Inspect container
docker compose exec backend bash

# Check database connection
docker compose exec backend python manage.py dbshell

# Check Django configuration
docker compose exec backend python manage.py check
```

---

## 🔧 Maintenance

### Regular Tasks

#### Database Backup

```bash
# Create backup
docker compose exec db pg_dump -U lenza_user lenza_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script (add to cron)
#!/bin/bash
BACKUP_DIR="/opt/backups/lenza_erp"
mkdir -p $BACKUP_DIR
docker compose -f /opt/lenza_erp/docker-compose.yml exec -T db pg_dump -U lenza_user lenza_db > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

#### Restore Database

```bash
# Stop backend and celery
docker compose stop backend celery

# Restore
docker compose exec -T db psql -U lenza_user lenza_db < backup_file.sql

# Start services
docker compose start backend celery
```

#### Update Application

```bash
cd /opt/lenza_erp
git pull origin main
docker compose down
docker compose up -d --build
```

#### Clean Docker Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (careful!)
docker system prune -a --volumes
```

#### Monitor Disk Space

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Check log sizes
du -sh /var/lib/docker/containers/*/*-json.log
```

#### View Application Logs

```bash
# Tail logs
docker compose logs -f --tail=100

# Save logs to file
docker compose logs > app_logs_$(date +%Y%m%d).log
```

### Performance Optimization

#### Enable Log Rotation

Create `/etc/docker/daemon.json`:
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

#### Scale Services

```bash
# Run multiple Celery workers
docker compose up -d --scale celery=3

# Increase Gunicorn workers
# Edit backend/entrypoint.sh:
# --workers 8 (instead of 4)
```

### Security Updates

```bash
# Update system packages
apt update && apt upgrade -y

# Update Docker
apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Rebuild containers with latest base images
docker compose build --no-cache
docker compose up -d
```

---

## 📊 Monitoring

### Health Checks

```bash
# Quick health check script
#!/bin/bash
echo "=== Container Status ==="
docker compose ps

echo -e "\n=== Backend Health ==="
curl -s http://localhost:8000/api/ | head -n 5

echo -e "\n=== Frontend Health ==="
curl -s http://localhost:3000 | grep -o "<title>.*</title>"

echo -e "\n=== Database Health ==="
docker compose exec db pg_isready -U lenza_user

echo -e "\n=== Disk Usage ==="
df -h | grep -E "/$|/opt"

echo -e "\n=== Memory Usage ==="
free -h
```

### Set Up Monitoring (Optional)

Consider adding:
- **Prometheus + Grafana** for metrics
- **Sentry** for error tracking
- **Uptime Robot** for uptime monitoring
- **CloudFlare** for CDN and DDoS protection

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Test all application features
2. ✅ Configure automated backups (cron job)
3. ✅ Set up monitoring and alerts
4. ✅ Configure email backend (SMTP)
5. ✅ Enable log aggregation
6. ✅ Document custom configurations
7. ✅ Train team on maintenance procedures
8. ✅ Create runbooks for common issues

---

## 📞 Support

### Resources

- **GitHub Repository:** https://github.com/zokirbek85/lenza_erp
- **Issues:** https://github.com/zokirbek85/lenza_erp/issues
- **VPS Deployment Guide:** [VPS_DEPLOY.md](./VPS_DEPLOY.md)

### Getting Help

1. Check this documentation
2. Review [VPS_DEPLOY.md](./VPS_DEPLOY.md)
3. Check container logs: `docker compose logs`
4. Open GitHub issue with logs and error details

---

## ✅ Checklist

### Before Production

- [ ] Change all default passwords
- [ ] Generate secure SECRET_KEY (50+ chars)
- [ ] Configure domain DNS records
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Test all application features
- [ ] Configure automated backups
- [ ] Set up monitoring
- [ ] Document custom configurations

### GitHub Configuration

- [ ] Add VPS_HOST secret
- [ ] Add VPS_USER secret
- [ ] Add VPS_SSH_KEY secret
- [ ] Test GitHub Actions workflow
- [ ] Verify auto-deployment works

### Post-Deployment

- [ ] Create Django superuser
- [ ] Test user authentication
- [ ] Verify database connections
- [ ] Check static/media file serving
- [ ] Test Celery tasks
- [ ] Monitor resource usage
- [ ] Set up log rotation
- [ ] Schedule regular backups

---

**🎉 Deployment Complete!**

Your Lenza ERP is now fully Dockerized and deployed with automated CI/CD. Push to `main` branch to trigger automatic deployment.

For detailed VPS setup instructions, see [VPS_DEPLOY.md](./VPS_DEPLOY.md).
