# 📋 Docker Deployment Checklist

Use this checklist when deploying Lenza ERP to production.

## ☑️ Pre-Deployment

### Domain & DNS
- [ ] Domain purchased/configured (e.g., erp.lenza.uz)
- [ ] A record points to server IP (e.g., 45.138.159.195)
- [ ] DNS propagated (test with `dig erp.lenza.uz`)
- [ ] Wait 5-30 minutes for global DNS propagation

### VPS Server
- [ ] Ubuntu 24.04 LTS installed
- [ ] Root SSH access confirmed
- [ ] Server IP is static/dedicated
- [ ] Minimum 4GB RAM, 2 CPU cores
- [ ] At least 40GB free disk space

### Local Preparation
- [ ] Clone repository to local machine
- [ ] Review `.env.example` for required variables
- [ ] Prepare Telegram bot token (if using)
- [ ] Prepare Telegram group chat ID (if using)

---

## 🚀 Deployment Steps

### Step 1: Server Installation (10-15 minutes)

```bash
# SSH into your server
ssh root@45.138.159.195

# Download install script
cd /opt
wget https://raw.githubusercontent.com/zokirbek85/lenza_erp/main/server_install.sh
chmod +x server_install.sh

# Run installation
./server_install.sh
```

**Checklist:**
- [ ] Script completed without errors
- [ ] Docker installed: `docker --version`
- [ ] Docker Compose installed: `docker compose version`
- [ ] Nginx installed: `nginx -v`
- [ ] Certbot installed: `certbot --version`
- [ ] UFW firewall enabled: `ufw status`
- [ ] Repository cloned to `/opt/lenza_erp`
- [ ] `.env` file created with secrets
- [ ] Docker network created: `docker network ls | grep lenza`

**Troubleshooting:**
```bash
# If script fails, check:
tail -100 /var/log/syslog
systemctl status docker
```

---

### Step 2: Environment Configuration (5 minutes)

```bash
cd /opt/lenza_erp

# Edit .env file
nano .env
# or
vim .env
```

**Update these values:**
- [ ] `TELEGRAM_BOT_TOKEN` (if using Telegram notifications)
- [ ] `TELEGRAM_GROUP_CHAT_ID` (if using Telegram notifications)
- [ ] Verify `DJANGO_ALLOWED_HOSTS` includes your domain
- [ ] Verify `CSRF_TRUSTED_ORIGINS` includes your domain with https://
- [ ] Verify `VITE_API_URL` is set to your domain

**Example:**
```bash
TELEGRAM_BOT_TOKEN=8219609902:AAHtZkLxmZ4_E6fo_nwFDWkE2nnZyAxNA3M
TELEGRAM_GROUP_CHAT_ID=-1003006758530
DJANGO_ALLOWED_HOSTS=erp.lenza.uz,45.138.159.195,0.0.0.0,127.0.0.1,localhost
CSRF_TRUSTED_ORIGINS=https://erp.lenza.uz,http://45.138.159.195
VITE_API_URL=https://erp.lenza.uz
```

**Save and verify:**
- [ ] File saved
- [ ] Permissions: `chmod 600 .env`
- [ ] No syntax errors: `cat .env | grep -v "^#" | grep "="`

---

### Step 3: Initial Deployment (20-30 minutes)

```bash
cd /opt/lenza_erp

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**The script will:**
1. Build Docker images (10-15 min)
2. Start database and Redis
3. Run migrations
4. **Prompt for superuser creation** ← Interactive!
5. Start backend and frontend
6. Copy static files
7. Request SSL certificate ← May require domain verification
8. Configure Nginx

**During Deployment:**
- [ ] No build errors
- [ ] Database started successfully
- [ ] Migrations completed
- [ ] **Created Django superuser** (write down credentials!)
- [ ] Backend container running
- [ ] Frontend container running
- [ ] SSL certificate obtained
- [ ] Nginx configured and reloaded

**Superuser Creation:**
```
Username: admin
Email: admin@lenza.uz
Password: ******** (strong password!)
```
📝 **Save these credentials securely!**

**Troubleshooting:**
```bash
# If deployment fails at any step:

# Check container status
docker ps -a

# Check logs
docker logs lenza_backend_blue
docker logs lenza_db

# Check disk space
df -h

# Check Nginx
nginx -t
systemctl status nginx
```

---

### Step 4: Verification (5 minutes)

**Test Each Endpoint:**

- [ ] **Frontend**: Open https://erp.lenza.uz in browser
  - Should see login page
  - No SSL warnings
  - No 502/503 errors

- [ ] **Admin**: https://erp.lenza.uz/admin/
  - Login with superuser credentials
  - Should see Django admin panel

- [ ] **API Health**: https://erp.lenza.uz/api/health/
  - Should return: `{"status": "ok"}`

- [ ] **API Docs**: https://erp.lenza.uz/api/ (if available)
  - Should show API browsable interface

**Container Status:**
```bash
docker ps
# All containers should show "Up" status:
# - lenza_db
# - lenza_redis
# - lenza_backend_blue
# - lenza_frontend_blue
```

**Health Check:**
```bash
cd /opt/lenza_erp
chmod +x health.sh
./health.sh
# All checks should show ✓ (green)
```

---

## 🔄 Post-Deployment Setup

### Configure Backups (5 minutes)

```bash
cd /opt/lenza_erp
chmod +x backup.sh

# Test backup
./backup.sh

# Schedule daily backups at 2 AM
crontab -e
# Add this line:
0 2 * * * /opt/lenza_erp/backup.sh >> /var/log/lenza_backup.log 2>&1
```

**Verify:**
- [ ] Manual backup completed successfully
- [ ] Backup files in `/root/lenza_backups/`
- [ ] Cron job scheduled: `crontab -l`

### Make All Scripts Executable

```bash
cd /opt/lenza_erp
chmod +x *.sh
ls -la *.sh  # Verify -rwxr-xr-x permissions
```

- [ ] `server_install.sh` executable
- [ ] `deploy.sh` executable
- [ ] `update.sh` executable
- [ ] `backup.sh` executable
- [ ] `logs.sh` executable
- [ ] `health.sh` executable

### SSL Auto-Renewal Test

```bash
# Test renewal (dry run)
certbot renew --dry-run
```

- [ ] Dry run successful
- [ ] Renewal hook configured: `ls /etc/letsencrypt/renewal-hooks/deploy/`

---

## 🧪 First Update Test (Optional)

Test the blue/green deployment:

```bash
cd /opt/lenza_erp
chmod +x update.sh

# Make a small change (e.g., update README)
echo "# Test update" >> TEST_UPDATE.txt
git add TEST_UPDATE.txt
git commit -m "Test blue/green deployment"
git push

# On server, run update
./update.sh
```

**Verify:**
- [ ] Update completed without downtime
- [ ] Stack switched (blue → green or green → blue)
- [ ] Website still accessible during update
- [ ] Old stack stopped
- [ ] Active stack marker updated: `cat deploy/active_stack`

---

## 📊 Monitoring Setup

### View Logs
```bash
cd /opt/lenza_erp
./logs.sh
```

### Check Health
```bash
cd /opt/lenza_erp
./health.sh
```

### Monitor Resources
```bash
# Real-time stats
docker stats

# Disk usage
df -h
docker system df
```

---

## 🔐 Security Checklist

- [ ] Firewall enabled: `ufw status`
- [ ] Only ports 22, 80, 443 open
- [ ] `.env` file permissions: `chmod 600` (verify with `ls -l .env`)
- [ ] SSH key-based auth (disable password auth)
- [ ] Django DEBUG=False (verify in `.env`)
- [ ] Strong database password (auto-generated)
- [ ] Strong Django secret key (auto-generated)
- [ ] SSL certificate valid (check with `certbot certificates`)
- [ ] HTTPS redirect working (test http:// → https://)

**Optional: Disable SSH Password Auth**
```bash
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
systemctl restart sshd
```

---

## 📝 Documentation & Access

**Save This Information:**

```
===========================================
Lenza ERP Production Deployment
===========================================

Server IP: 45.138.159.195
Domain: https://erp.lenza.uz

Django Admin:
  URL: https://erp.lenza.uz/admin/
  Username: admin
  Password: [SAVED_SECURELY]

Database:
  Name: lenza_erp_db
  User: lenza_user
  Password: [IN_ENV_FILE]

Active Stack: [blue/green]
Deployment Date: [DATE]

Backup Location: /root/lenza_backups/
Active Stack File: /opt/lenza_erp/deploy/active_stack

===========================================
```

---

## ✅ Final Verification

Run through this final checklist:

### Functionality
- [ ] Can login to frontend
- [ ] Can access Django admin
- [ ] API endpoints responding
- [ ] WebSocket connections working (if applicable)
- [ ] Static files loading (CSS, JS, images)
- [ ] Media uploads working
- [ ] Telegram notifications working (if configured)

### Performance
- [ ] Page load time < 3 seconds
- [ ] No console errors in browser
- [ ] No 500 errors in backend logs
- [ ] Database queries performant

### Security
- [ ] HTTPS working (no warnings)
- [ ] HTTP redirects to HTTPS
- [ ] Admin panel requires authentication
- [ ] API requires authentication (if configured)
- [ ] CORS configured correctly

### Operations
- [ ] Can view logs with `./logs.sh`
- [ ] Can check health with `./health.sh`
- [ ] Can create backup with `./backup.sh`
- [ ] Automated backups scheduled
- [ ] SSL renewal configured

---

## 🎉 Deployment Complete!

Your Lenza ERP is now live at **https://erp.lenza.uz**

### Next Steps

1. **User Creation**: Create user accounts via Django admin
2. **Data Import**: Import initial data if needed
3. **Training**: Train users on the system
4. **Monitoring**: Set up monitoring/alerting (optional)

### For Updates

```bash
cd /opt/lenza_erp
./update.sh  # Zero-downtime blue/green deployment!
```

### Need Help?

- **Logs**: `./logs.sh`
- **Health**: `./health.sh`
- **Docs**: `DEPLOY_DOCKER_VPS.md`
- **Support**: admin@lenza.uz

---

**🎊 Congratulations on your successful deployment! 🎊**
