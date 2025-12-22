#!/bin/bash
# Add backup cron job

# Get current crontab or empty if none exists
(crontab -l 2>/dev/null || echo "") | grep -v "backup.sh" > /tmp/mycron

# Add new cron job
echo "0 3 * * * /opt/lenza_erp/backup.sh >> /var/log/lenza_backup.log 2>&1" >> /tmp/mycron

# Install new crontab
crontab /tmp/mycron

# Show result
echo "Cron job added successfully!"
echo ""
echo "Current cron jobs:"
crontab -l

# Cleanup
rm /tmp/mycron
