# Lenza ERP - VPS Deployment Guide

Complete step-by-step guide to deploy Lenza ERP on Ubuntu 24.04 VPS.

## Server Information

- **Domain:** erp.lenza.uz
- **IP Address:** 45.138.159.195
- **OS:** Ubuntu 24.04
- **User:** root

---

## Step 1: Initial Server Setup

### 1.1 Connect to VPS

```bash
ssh root@45.138.159.195
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Install Required Packages

```bash
apt install -y curl git ufw nginx certbot python3-certbot-nginx
```

---

## Step 2: Install Docker and Docker Compose

### 2.1 Install Docker

```bash
# Remove old versions if any
apt remove docker docker-engine docker.io containerd runc

# Install dependencies
apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2.2 Enable Docker Service

```bash
systemctl enable docker
systemctl start docker
```

---

## Step 3: Clone Repository

### 3.1 Create Application Directory

```bash
mkdir -p /opt/lenza_erp
cd /opt/lenza_erp
```

### 3.2 Clone from GitHub

```bash
git clone https://github.com/zokirbek85/lenza_erp.git .
```

---

## Step 4: Configure Environment Variables

### 4.1 Create Backend Environment File

```bash
nano .env.backend
```

**Add the following content (replace with secure values):**

```env
ENV=production
DEBUG=0
DJANGO_SECRET_KEY=YOUR_SUPER_SECRET_KEY_MIN_50_CHARS_CHANGE_THIS
DJANGO_ALLOWED_HOSTS=erp.lenza.uz,localhost,127.0.0.1,backend
DJANGO_CSRF_TRUSTED_ORIGINS=https://erp.lenza.uz

USE_POSTGRES=true
POSTGRES_DB=lenza_db
POSTGRES_USER=lenza_user
POSTGRES_PASSWORD=YOUR_SECURE_DB_PASSWORD
POSTGRES_HOST=db
POSTGRES_PORT=5432

STATIC_URL=/static/
STATIC_ROOT=/app/staticfiles
MEDIA_URL=/media/
MEDIA_ROOT=/app/media

JWT_ACCESS_MINUTES=30
JWT_REFRESH_MINUTES=1440

DJANGO_CORS_ALLOWED_ORIGINS=https://erp.lenza.uz

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_GROUP_CHAT_ID=your-chat-id

COMPANY_NAME=Lenza ERP
COMPANY_SLOGAN=Your Business Solution
COMPANY_ADDRESS=Tashkent, Uzbekistan
COMPANY_PHONE=+998 XX XXX XX XX

DJANGO_LOG_LEVEL=INFO
```

**Save and exit:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.2 Create Database Environment File

```bash
nano .env.db
```

**Add the following content:**

```env
POSTGRES_USER=lenza_user
POSTGRES_PASSWORD=YOUR_SECURE_DB_PASSWORD
POSTGRES_DB=lenza_db
```

**Save and exit:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.3 Secure Environment Files

```bash
chmod 600 .env.backend .env.db
```

---

## Step 5: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## Step 6: Build and Start Docker Containers

### 6.1 Build Images

```bash
cd /opt/lenza_erp
docker compose build
```

### 6.2 Start Containers

```bash
docker compose up -d
```

### 6.3 Check Container Status

```bash
docker compose ps
```

**Expected output:**
```
NAME                IMAGE              STATUS
lenza_backend       lenza_erp-backend  Up
lenza_frontend      lenza_erp-frontend Up
lenza_celery        lenza_erp-backend  Up
lenza_db            postgres:15-alpine Up (healthy)
```

### 6.4 View Logs

```bash
# All containers
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Step 7: Configure Nginx Reverse Proxy

### 7.1 Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/erp.lenza.uz
```

**Add the following content:**

```nginx
server {
    listen 80;
    server_name erp.lenza.uz;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client max body size (for file uploads)
    client_max_body_size 50M;

    # Frontend (React)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://localhost:8000/admin/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (Django)
    location /static/ {
        proxy_pass http://localhost:8000/static/;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files (Django)
    location /media/ {
        proxy_pass http://localhost:8000/media/;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public";
    }
}
```

**Save and exit:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 7.2 Enable Site Configuration

```bash
ln -s /etc/nginx/sites-available/erp.lenza.uz /etc/nginx/sites-enabled/
```

### 7.3 Test Nginx Configuration

```bash
nginx -t
```

**Expected output:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 7.4 Restart Nginx

```bash
systemctl restart nginx
```

---

## Step 8: Setup SSL Certificate (HTTPS)

### 8.1 Obtain SSL Certificate with Certbot

```bash
certbot --nginx -d erp.lenza.uz
```

**Follow the prompts:**
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 8.2 Verify SSL Configuration

```bash
systemctl status certbot.timer
```

### 8.3 Test Auto-Renewal

```bash
certbot renew --dry-run
```

---

## Step 9: Create Django Superuser

### 9.1 Access Backend Container

```bash
docker compose exec backend bash
```

### 9.2 Create Superuser

```bash
python manage.py createsuperuser
```

**Follow the prompts:**
- Username: admin
- Email: admin@lenza.uz
- Password: (your secure password)

### 9.3 Exit Container

```bash
exit
```

---

## Step 10: Verify Deployment

### 10.1 Check Services

```bash
# Check Docker containers
docker compose ps

# Check Nginx
systemctl status nginx

# Check disk space
df -h
```

### 10.2 Test Application

Open your browser and navigate to:

- **Frontend:** https://erp.lenza.uz
- **Admin Panel:** https://erp.lenza.uz/admin/
- **API:** https://erp.lenza.uz/api/

---

## Maintenance Commands

### View Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Database only
docker compose logs -f db
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

### Update Application

```bash
cd /opt/lenza_erp
git pull origin main
docker compose down
docker compose up -d --build
```

### Database Backup

```bash
# Create backup
docker compose exec db pg_dump -U lenza_user lenza_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose exec -T db psql -U lenza_user lenza_db < backup_file.sql
```

### Clean Docker Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (careful!)
docker system prune -a --volumes
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs backend

# Rebuild container
docker compose up -d --build backend
```

### Database Connection Error

```bash
# Check database is running
docker compose ps db

# Check database logs
docker compose logs db

# Verify environment variables
cat .env.backend | grep POSTGRES
```

### Nginx 502 Bad Gateway

```bash
# Check backend is running
docker compose ps backend

# Check backend logs
docker compose logs backend

# Test backend directly
curl http://localhost:8000/api/
```

### SSL Certificate Issues

```bash
# Renew certificate manually
certbot renew

# Check certificate status
certbot certificates
```

---

## Security Recommendations

1. **Change default passwords** in `.env.backend` and `.env.db`
2. **Generate strong SECRET_KEY** (minimum 50 characters)
3. **Enable firewall** with only necessary ports
4. **Regular backups** of database and media files
5. **Keep system updated**: `apt update && apt upgrade`
6. **Monitor logs** regularly for suspicious activity
7. **Use SSH keys** instead of password authentication
8. **Setup fail2ban** for additional security

---

## Next Steps

After successful deployment:

1. ✅ Configure GitHub Actions for auto-deployment (see `.github/workflows/deploy.yml`)
2. ✅ Setup monitoring and alerts
3. ✅ Configure automated backups
4. ✅ Review and optimize Django settings for production
5. ✅ Setup log rotation
6. ✅ Configure email backend for notifications

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/zokirbek85/lenza_erp/issues
- Documentation: Check project README.md

---

**Deployment completed successfully! 🚀**
