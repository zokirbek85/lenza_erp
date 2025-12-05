# 🚀 Media 404 Fix - Quick Start Guide

## Problem Summary
✗ Media files return 404: `https://erp.lenza.uz/media/catalog/variants/*.png`  
✗ Images exist in admin but not accessible via NGINX  
✗ Docker named volumes blocking host filesystem access  

## Solution
✓ Migrate from Docker named volumes to host bind mounts  
✓ Fix NGINX media alias configuration  
✓ Ensure proper file permissions and paths  

---

## 🎯 Quick Deployment (Recommended)

### One Command (Automated)

```bash
# SSH to server
ssh root@erp.lenza.uz

# Go to project
cd /opt/lenza_erp

# Pull latest code
git pull origin main

# Run automated deployment
sudo bash deploy_media_fix.sh
```

**This will automatically:**
1. ✅ Migrate media files from Docker to host
2. ✅ Update Docker Compose configuration
3. ✅ Rebuild containers with new volumes
4. ✅ Update NGINX configuration
5. ✅ Restart services
6. ✅ Verify deployment

**Duration:** ~5 minutes  
**Downtime:** ~1 minute during container restart  

---

## 📋 Manual Deployment (Step-by-Step)

If you prefer manual control:

```bash
# 1. Pull code
cd /opt/lenza_erp
git pull origin main

# 2. Run migration
chmod +x migrate_media.sh
sudo bash migrate_media.sh

# 3. Stop containers (check active stack first)
cat /etc/nginx/conf.d/active_upstream.conf
docker-compose -f deploy/docker-compose.blue.yml down  # or green

# 4. Rebuild & start
docker-compose -f deploy/docker-compose.blue.yml up -d --build

# 5. Update NGINX
cp deploy/nginx/erp.lenza.uz.conf /etc/nginx/sites-available/erp.lenza.uz
nginx -t
nginx -s reload

# 6. Verify
curl -I https://erp.lenza.uz/media/catalog/variants/<filename>.png
```

---

## ✅ Verification

### 1. Check Media Directory
```bash
ls -la /var/www/lenza_erp/media/catalog/variants/
# Should show variant images with proper permissions (755)
```

### 2. Test Media Access
```bash
# From server
curl -I http://localhost:8000/media/catalog/variants/PDG-50011-loft-belyy.png

# Through NGINX
curl -I https://erp.lenza.uz/media/catalog/variants/PDG-50011-loft-belyy.png

# Expected: HTTP/2 200 OK
```

### 3. Check Frontend
Open https://erp.lenza.uz/catalog
- ✅ Images should load (or show placeholder if file missing)
- ✅ No 404 errors in browser console
- ✅ Network tab shows 200 OK for media files

### 4. Monitor Logs
```bash
# Backend logs
docker logs -f lenza_backend_blue

# NGINX error log
tail -f /var/log/nginx/error.log
```

---

## 🔧 What Changed

### Docker Compose
**Before:**
```yaml
volumes:
  - media_volume:/app/media  # Named volume (isolated)
```

**After:**
```yaml
volumes:
  - /var/www/lenza_erp/media:/app/media  # Host bind mount (shared)
```

### NGINX
**Fixed:**
```nginx
location /media/ {
    alias /var/www/lenza_erp/media/;  # Trailing slash is CRITICAL!
    autoindex off;
    access_log off;
}
```

### File Structure
```
/var/www/lenza_erp/
├── media/
│   └── catalog/
│       └── variants/
│           ├── PDG-50011-loft-belyy.png
│           ├── PDG-50001-26K-Loft-mokko.png
│           └── ...
└── staticfiles/
```

---

## 🐛 Troubleshooting

### Problem: Directory not found
```bash
sudo mkdir -p /var/www/lenza_erp/media/catalog/variants
sudo chown -R 1000:1000 /var/www/lenza_erp/media
sudo chmod -R 755 /var/www/lenza_erp/media
```

### Problem: Permission denied
```bash
# Check permissions
ls -la /var/www/lenza_erp/media

# Fix ownership (Docker user is 1000:1000)
sudo chown -R 1000:1000 /var/www/lenza_erp/media

# Fix permissions
sudo chmod -R 755 /var/www/lenza_erp/media
```

### Problem: Files in container but not on host
```bash
# Copy manually
docker cp lenza_backend_blue:/app/media/. /var/www/lenza_erp/media/
```

### Problem: NGINX 403 Forbidden
```bash
# Check NGINX user can read
sudo -u nginx cat /var/www/lenza_erp/media/catalog/variants/<file>.png

# If fails, check SELinux (RHEL/CentOS only)
getenforce
sudo chcon -Rt httpd_sys_content_t /var/www/lenza_erp/media
```

### Problem: Still 404 after deployment
```bash
# 1. Verify file exists on host
ls -la /var/www/lenza_erp/media/catalog/variants/

# 2. Check NGINX config
nginx -T | grep -A 10 "location /media"

# 3. Check NGINX error log
tail -f /var/log/nginx/error.log

# 4. Test backend directly (bypass NGINX)
curl -I http://localhost:8000/media/catalog/variants/<file>.png

# 5. Restart everything
docker-compose -f deploy/docker-compose.blue.yml restart
nginx -s reload
```

---

## 📊 Success Metrics

After deployment, you should see:

- ✅ **0 HTTP 404 errors** in browser console
- ✅ **200 OK responses** for all media URLs
- ✅ **Images visible** in frontend catalog (or placeholder if file missing)
- ✅ **New uploads work** immediately via admin panel
- ✅ **Disk usage visible** on host: `du -sh /var/www/lenza_erp/media`

---

## 📚 Documentation

- **Full deployment guide:** `MEDIA_404_FIX_DEPLOYMENT.md`
- **Migration script:** `migrate_media.sh`
- **Quick deploy:** `deploy_media_fix.sh`
- **Image upload guide:** `VARIANT_IMAGES_GUIDE.md`

---

## 🆘 Support

If problems persist after following this guide:

1. **Check logs:**
   ```bash
   docker logs lenza_backend_blue
   tail -f /var/log/nginx/error.log
   ```

2. **Verify architecture:**
   ```bash
   # File should exist in 2 places:
   ls -la /var/www/lenza_erp/media/catalog/variants/file.png  # Host
   docker exec lenza_backend_blue ls -la /app/media/catalog/variants/file.png  # Container
   ```

3. **Test step by step:**
   ```bash
   # 1. Does file exist?
   ls -la /var/www/lenza_erp/media/catalog/variants/<file>.png
   
   # 2. Can NGINX user read it?
   sudo -u nginx cat /var/www/lenza_erp/media/catalog/variants/<file>.png
   
   # 3. Does backend serve it?
   curl -I http://localhost:8000/media/catalog/variants/<file>.png
   
   # 4. Does NGINX proxy it?
   curl -I https://erp.lenza.uz/media/catalog/variants/<file>.png
   ```

---

## 📅 Maintenance

### Upload New Images
```bash
# Via admin panel (automatic):
https://erp.lenza.uz/admin/catalog/productvariant/

# Via command line:
docker exec lenza_backend_blue python manage.py shell
>>> from catalog.models import ProductVariant
>>> variant = ProductVariant.objects.get(id=1)
>>> # ... upload image
```

### Backup Media Files
```bash
# Create backup
tar -czf media_backup_$(date +%Y%m%d).tar.gz /var/www/lenza_erp/media/

# Restore backup
tar -xzf media_backup_20251206.tar.gz -C /
```

### Monitor Disk Space
```bash
# Check media usage
du -sh /var/www/lenza_erp/media

# Find large files
find /var/www/lenza_erp/media -type f -size +1M -exec ls -lh {} \;
```

---

**Version:** 1.0  
**Last Updated:** 2025-12-06  
**Status:** ✅ Ready for Production  
**Related Commits:** #ecf6945, #315d3af, #ac75e05
