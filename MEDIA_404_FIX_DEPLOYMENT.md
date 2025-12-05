# Media Files 404 Fix - Deployment Guide

## Problem

Media files (variant images) returning 404 from NGINX:
```
GET https://erp.lenza.uz/media/catalog/variants/PDG-50011-loft-belyy.png
→ 404 Not Found
```

## Root Cause

1. **Docker volumes misconfigured**: Used named volumes instead of host bind mounts
2. **NGINX can't access**: Named volumes stored inside Docker, not accessible by NGINX
3. **Missing media directory**: `/var/www/lenza_erp/media` doesn't exist on host

## Solution Applied

### 1. Fixed Docker Compose Volumes

**Before (WRONG):**
```yaml
volumes:
  - static_volume:/app/staticfiles  # Named volume - NGINX can't access
  - media_volume:/app/media         # Named volume - NGINX can't access
```

**After (CORRECT):**
```yaml
volumes:
  - /var/www/lenza_erp/staticfiles:/app/staticfiles  # Host bind mount
  - /var/www/lenza_erp/media:/app/media              # Host bind mount
```

### 2. Fixed NGINX Configuration

**Added to media location:**
```nginx
location /media/ {
    alias /var/www/lenza_erp/media/;  # Slash at end is CRITICAL!
    expires 7d;
    add_header Cache-Control "public";
    autoindex off;
    access_log off;
}
```

### 3. Created Migration Script

`migrate_media.sh` - Automatically migrates existing media files from Docker volumes to host

## Deployment Steps (VPS)

### Step 1: SSH to Server

```bash
ssh root@erp.lenza.uz
# Or: ssh user@45.138.159.195
```

### Step 2: Backup (Optional but Recommended)

```bash
cd /opt/lenza_erp

# Backup current containers
docker ps -a > docker_containers_backup.txt

# Backup database (if needed)
docker exec lenza_db pg_dump -U lenza_erp_user lenza_erp_db > backup_$(date +%Y%m%d).sql
```

### Step 3: Pull Latest Code

```bash
cd /opt/lenza_erp
git pull origin main
```

### Step 4: Run Migration Script

```bash
# Make executable
chmod +x migrate_media.sh

# Run as root
sudo bash migrate_media.sh
```

**Migration script will:**
- ✅ Create `/var/www/lenza_erp/media` directory
- ✅ Copy existing media files from Docker containers
- ✅ Extract files from named volumes
- ✅ Set correct permissions (755, owner 1000:1000)
- ✅ Verify migration success

**Expected output:**
```
[INFO] Migration Summary:
  Total media files: 127
  Variant images: 45
  Media path: /var/www/lenza_erp/media
  Static path: /var/www/lenza_erp/staticfiles
```

### Step 5: Stop Current Containers

```bash
# Check which stack is active (blue or green)
cat /etc/nginx/conf.d/active_upstream.conf

# Stop active stack (example: blue)
docker-compose -f deploy/docker-compose.blue.yml down

# Or if using update script
./update.sh
```

### Step 6: Remove Old Volumes (Optional)

```bash
# List old volumes
docker volume ls | grep lenza

# Remove old named volumes (ONLY after verifying new setup works!)
docker volume rm lenza_media_shared lenza_static_blue lenza_static_green
```

### Step 7: Rebuild and Start

```bash
# Start with new configuration
docker-compose -f deploy/docker-compose.blue.yml up -d --build

# Check logs
docker logs -f lenza_backend_blue

# Verify backend started
curl http://localhost:8000/api/health/
```

### Step 8: Update NGINX Configuration

```bash
# Copy new NGINX config
cp /opt/lenza_erp/deploy/nginx/erp.lenza.uz.conf /etc/nginx/sites-available/erp.lenza.uz

# Test NGINX config
nginx -t

# Reload NGINX (no downtime)
nginx -s reload

# Or restart if needed
systemctl restart nginx
```

### Step 9: Verify Media Access

```bash
# Test from server
curl -I http://localhost:8000/media/catalog/variants/PDG-50011-loft-belyy.png

# Test through NGINX
curl -I https://erp.lenza.uz/media/catalog/variants/PDG-50011-loft-belyy.png

# Should return: HTTP/2 200 OK
```

**Expected response:**
```
HTTP/2 200 
content-type: image/png
content-length: 45678
cache-control: public
expires: Fri, 13 Dec 2025 12:00:00 GMT
```

### Step 10: Check Frontend

```bash
# Open browser
https://erp.lenza.uz/catalog

# Check browser console - should have NO 404 errors
# Images should load or show placeholder if file missing
```

## Verification Checklist

- [ ] Migration script ran successfully
- [ ] `/var/www/lenza_erp/media/catalog/variants/` exists and has files
- [ ] Permissions are 755, owner 1000:1000
- [ ] Docker containers started successfully
- [ ] NGINX config tested: `nginx -t` passes
- [ ] NGINX reloaded: `nginx -s reload`
- [ ] Media URL returns 200: `curl -I https://erp.lenza.uz/media/catalog/variants/...`
- [ ] Frontend catalog shows images
- [ ] Browser console has no 404 errors

## Troubleshooting

### Problem: Media directory empty after migration

```bash
# Check if files exist in container
docker exec lenza_backend_blue ls -la /app/media/catalog/variants/

# Manual copy if needed
docker cp lenza_backend_blue:/app/media/. /var/www/lenza_erp/media/
```

### Problem: Permission denied

```bash
# Fix permissions
sudo chown -R 1000:1000 /var/www/lenza_erp/media
sudo chmod -R 755 /var/www/lenza_erp/media
```

### Problem: NGINX still returns 404

```bash
# Check NGINX error log
tail -f /var/log/nginx/error.log

# Common issues:
# 1. Alias missing trailing slash
# 2. Wrong path in alias
# 3. Permission denied (check with: sudo -u nginx ls /var/www/lenza_erp/media)
```

### Problem: File exists but 404

```bash
# Verify file path
ls -la /var/www/lenza_erp/media/catalog/variants/PDG-50011-loft-belyy.png

# Check NGINX access
sudo -u nginx cat /var/www/lenza_erp/media/catalog/variants/PDG-50011-loft-belyy.png

# If permission denied, fix:
sudo chmod -R 755 /var/www/lenza_erp/media
```

### Problem: SELinux blocking (RHEL/CentOS)

```bash
# Check if SELinux is the issue
getenforce

# If Enforcing, set context:
sudo chcon -Rt httpd_sys_content_t /var/www/lenza_erp/media

# Or disable SELinux (not recommended for production):
sudo setenforce 0
```

## Rollback (If Needed)

```bash
# Stop new containers
docker-compose -f deploy/docker-compose.blue.yml down

# Revert to old docker-compose
git checkout HEAD~1 deploy/docker-compose.blue.yml

# Start old version
docker-compose -f deploy/docker-compose.blue.yml up -d

# Note: Old media files should still be in named volumes
```

## Post-Deployment

### Upload New Images via Admin

1. Login: https://erp.lenza.uz/admin/
2. Go to: Catalog > Product Variants
3. Edit variant > Upload image
4. File will be saved to: `/var/www/lenza_erp/media/catalog/variants/`
5. Immediately accessible via: `https://erp.lenza.uz/media/catalog/variants/filename.png`

### Monitor Media Usage

```bash
# Check media disk usage
du -sh /var/www/lenza_erp/media

# Count variant images
find /var/www/lenza_erp/media/catalog/variants -type f | wc -l

# List recent uploads
ls -lth /var/www/lenza_erp/media/catalog/variants/ | head -10
```

## Files Changed

- ✅ `deploy/docker-compose.blue.yml` - Fixed volumes
- ✅ `deploy/docker-compose.green.yml` - Fixed volumes
- ✅ `deploy/nginx/erp.lenza.uz.conf` - Fixed media alias
- ✅ `docker-compose.yml` - Fixed local dev volumes
- ✅ `migrate_media.sh` - Migration script
- ✅ `MEDIA_404_FIX_DEPLOYMENT.md` - This guide

## Architecture After Fix

```
┌─────────────────────────────────────────────────────────────┐
│ NGINX (Host)                                                │
│ ├─ /media/ → alias /var/www/lenza_erp/media/              │
│ └─ Serves static files directly from host filesystem      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Docker Container: lenza_backend_blue                       │
│ ├─ MEDIA_ROOT=/app/media                                   │
│ └─ Volume: /var/www/lenza_erp/media:/app/media (bind)    │
│    (Django writes to /app/media, appears on host)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Host Filesystem                                             │
│ /var/www/lenza_erp/media/catalog/variants/                │
│ ├─ PDG-50011-loft-belyy.png                               │
│ ├─ PDG-50001-26K-Loft-mokko.png                          │
│ └─ ...                                                     │
└─────────────────────────────────────────────────────────────┘
```

## Testing

```bash
# From local machine
curl -I https://erp.lenza.uz/media/catalog/variants/PDG-50011-loft-belyy.png

# From server
curl -I http://localhost:8000/media/catalog/variants/PDG-50011-loft-belyy.png

# Test upload via admin
# 1. Upload image in admin
# 2. Check file created: ls -la /var/www/lenza_erp/media/catalog/variants/
# 3. Access via URL immediately
```

## Success Criteria

✅ All media URLs return 200 OK (not 404)  
✅ Frontend catalog displays images  
✅ No 404 errors in browser console  
✅ New uploads work immediately  
✅ NGINX serves files without backend proxy  
✅ Disk space used by media visible on host  

## Support

If issues persist:
1. Check logs: `docker logs lenza_backend_blue`
2. Check NGINX logs: `tail -f /var/log/nginx/error.log`
3. Verify permissions: `ls -la /var/www/lenza_erp/media/catalog/variants/`
4. Test backend directly: `curl http://localhost:8000/media/...`
5. Test NGINX: `curl https://erp.lenza.uz/media/...`

---

**Last Updated:** 2025-12-06  
**Related Commits:** Image null fix (#ac75e05), Pagination fix (#d5cac69)
