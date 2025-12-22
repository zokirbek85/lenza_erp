# Lenza ERP - Database Backup Setup Guide

## Overview

Lenza ERP includes automated backup functionality to protect your data. This guide explains how to set up and use the backup system.

## What Gets Backed Up

The backup system automatically backs up:
- ✅ **PostgreSQL Database** (compressed with gzip)
- ✅ **Media Files** (images, uploads, documents)
- ✅ **Environment Configuration** (.env file)

## Backup Schedule

- **Frequency**: Daily
- **Time**: 3:00 AM (server time)
- **Retention**: Last 7 days
- **Location**: `/root/lenza_backups/`

## Initial Setup

### 1. Run Auto-Setup Script (Recommended)

On your VPS server, run:

```bash
cd /root/lenza_erp
sudo bash setup_backup_cron.sh
```

This script will:
- Make backup.sh executable
- Create backup directory
- Set up cron job for daily backups at 3:00 AM
- Create log file
- Test the backup system

### 2. Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Make backup script executable
chmod +x /root/lenza_erp/backup.sh

# Create backup directory
mkdir -p /root/lenza_backups

# Create log file
touch /var/log/lenza_backup.log

# Add cron job (opens crontab editor)
crontab -e

# Add this line:
0 3 * * * /root/lenza_erp/backup.sh >> /var/log/lenza_backup.log 2>&1
```

## Manual Backup

To create a backup immediately:

```bash
cd /root/lenza_erp
bash backup.sh
```

## Monitoring Backups

### View Backup Log

```bash
# View entire log
cat /var/log/lenza_backup.log

# View last 20 lines
tail -20 /var/log/lenza_backup.log

# Follow log in real-time
tail -f /var/log/lenza_backup.log
```

### List Backups

```bash
# List all backups
ls -lh /root/lenza_backups/

# List only database backups
ls -lh /root/lenza_backups/db_*.sql.gz

# List by date (newest first)
ls -lt /root/lenza_backups/
```

### Check Backup Size

```bash
# Total backup directory size
du -sh /root/lenza_backups/

# Size of each backup file
du -h /root/lenza_backups/* | sort -h
```

## Restoring from Backup

### Restore Database

```bash
# Set your backup date/time
BACKUP_DATE="20250122_030000"  # Replace with actual backup timestamp

# Restore database
gunzip -c /root/lenza_backups/db_$BACKUP_DATE.sql.gz | \
docker exec -i lenza_db psql -U lenza_erp_user lenza_erp_db

# Or in one command
cd /root/lenza_erp
source .env
gunzip -c /root/lenza_backups/db_$BACKUP_DATE.sql.gz | \
docker exec -i lenza_db psql -U $POSTGRES_USER $POSTGRES_DB
```

### Restore Media Files

```bash
# Set your backup date/time
BACKUP_DATE="20250122_030000"

# Extract media files
tar -xzf /root/lenza_backups/media_$BACKUP_DATE.tar.gz \
-C /var/www/lenza_erp/

# Fix permissions
chown -R www-data:www-data /var/www/lenza_erp/media/
```

### Restore Environment Configuration

```bash
# Set your backup date/time
BACKUP_DATE="20250122_030000"

# Copy .env backup (CAREFUL - this will overwrite current .env!)
cp /root/lenza_backups/env_$BACKUP_DATE /root/lenza_erp/.env

# Restart services
cd /root/lenza_erp
docker-compose restart
```

## Backup File Naming

Backup files use the following naming convention:

- **Database**: `db_YYYYMMDD_HHMMSS.sql.gz`
  - Example: `db_20250122_030000.sql.gz` (January 22, 2025 at 3:00 AM)

- **Media**: `media_YYYYMMDD_HHMMSS.tar.gz`
  - Example: `media_20250122_030000.tar.gz`

- **Environment**: `env_YYYYMMDD_HHMMSS`
  - Example: `env_20250122_030000`

## Troubleshooting

### Check if Cron Job is Running

```bash
# View all cron jobs
crontab -l

# Should see something like:
# 0 3 * * * /root/lenza_erp/backup.sh >> /var/log/lenza_backup.log 2>&1
```

### Verify Cron Service

```bash
# Check cron service status
systemctl status cron

# Start cron if not running
systemctl start cron
```

### Test Backup Script

```bash
# Run backup script manually
bash /root/lenza_erp/backup.sh

# Check for errors
echo $?  # Should output 0 if successful
```

### Common Issues

**Issue**: Permission denied
```bash
# Solution: Make script executable
chmod +x /root/lenza_erp/backup.sh
```

**Issue**: Docker container not found
```bash
# Solution: Check container name
docker ps | grep lenza_db

# Update backup.sh with correct container name
```

**Issue**: Disk space full
```bash
# Check disk usage
df -h

# Reduce retention days in backup.sh
# Change RETENTION_DAYS=7 to a lower number
```

## Adjusting Backup Settings

Edit `backup.sh` to customize:

```bash
nano /root/lenza_erp/backup.sh
```

**Available settings**:
- `BACKUP_DIR`: Backup location (default: `/root/lenza_backups`)
- `RETENTION_DAYS`: How many days to keep backups (default: 7)
- `PROJECT_DIR`: Project location (default: `/opt/lenza_erp`)

**Changing backup schedule**:
```bash
# Edit crontab
crontab -e

# Change time (example: 2:30 AM)
30 2 * * * /root/lenza_erp/backup.sh >> /var/log/lenza_backup.log 2>&1

# Multiple backups per day (example: 6 AM and 6 PM)
0 6,18 * * * /root/lenza_erp/backup.sh >> /var/log/lenza_backup.log 2>&1
```

## Best Practices

1. ✅ **Verify backups regularly** - Check logs and backup files
2. ✅ **Test restore process** - Practice restoring on a test environment
3. ✅ **Monitor disk space** - Ensure enough space for backups
4. ✅ **Off-site backup** - Copy critical backups to another location
5. ✅ **Document restore procedures** - Keep this guide accessible
6. ✅ **Set up alerts** - Get notified if backups fail

## Off-Site Backup (Optional)

For additional safety, copy backups to another server:

```bash
# Using rsync (run from backup server)
rsync -avz --progress root@YOUR_VPS_IP:/root/lenza_backups/ /backup/lenza/

# Or use SCP
scp root@YOUR_VPS_IP:/root/lenza_backups/db_*.sql.gz /backup/lenza/
```

## Monitoring with Telegram Bot

You can set up notifications for backup status:

```bash
# Add to backup.sh after the backup completes
# (Requires Telegram bot token and chat ID)
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
-d chat_id=<YOUR_CHAT_ID> \
-d text="✅ Lenza ERP backup completed: $DATE"
```

## Support

If you encounter issues with backups:
1. Check the backup log: `/var/log/lenza_backup.log`
2. Verify cron is running: `systemctl status cron`
3. Test backup manually: `bash /root/lenza_erp/backup.sh`
4. Check disk space: `df -h`

---

**Last Updated**: January 2025
**Version**: 1.0
