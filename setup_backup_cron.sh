#!/usr/bin/env bash
# ========================================
# Lenza ERP - Auto Backup Setup
# Configures automatic daily database backups
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Lenza ERP - Auto Backup Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo -e "Please run: ${YELLOW}sudo bash setup_backup_cron.sh${NC}"
    exit 1
fi

# Get project directory
PROJECT_DIR="/root/lenza_erp"
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="/opt/lenza_erp"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found${NC}"
    echo -e "Please update PROJECT_DIR in this script"
    exit 1
fi

echo -e "${GREEN}Project directory: $PROJECT_DIR${NC}\n"

# Make backup script executable
chmod +x "$PROJECT_DIR/backup.sh"
echo -e "${GREEN}✓ Backup script is now executable${NC}\n"

# Create backup directory
BACKUP_DIR="/root/lenza_backups"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup directory created: $BACKUP_DIR${NC}\n"

# Create log file
touch /var/log/lenza_backup.log
chmod 644 /var/log/lenza_backup.log
echo -e "${GREEN}✓ Log file created: /var/log/lenza_backup.log${NC}\n"

# Setup cron job
CRON_JOB="0 3 * * * $PROJECT_DIR/backup.sh >> /var/log/lenza_backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup.sh"; then
    echo -e "${YELLOW}⚠ Cron job already exists${NC}"
    echo -e "${YELLOW}Current cron jobs:${NC}"
    crontab -l | grep backup
    echo ""
    read -p "Do you want to update the cron job? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove old cron job
        crontab -l | grep -v "backup.sh" | crontab -
        # Add new cron job
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo -e "${GREEN}✓ Cron job updated${NC}\n"
    else
        echo -e "${YELLOW}Skipping cron job update${NC}\n"
    fi
else
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}✓ Cron job added${NC}\n"
fi

# Test backup script
echo -e "${YELLOW}Testing backup script...${NC}"
if bash "$PROJECT_DIR/backup.sh"; then
    echo -e "${GREEN}✓ Backup test successful!${NC}\n"
else
    echo -e "${RED}✗ Backup test failed${NC}"
    echo -e "${YELLOW}Please check the backup script manually${NC}\n"
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Auto Backup Setup Complete!${NC}\n"
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  • Backup schedule: ${BLUE}Daily at 3:00 AM${NC}"
echo -e "  • Backup location: ${BLUE}$BACKUP_DIR${NC}"
echo -e "  • Retention: ${BLUE}7 days${NC}"
echo -e "  • Log file: ${BLUE}/var/log/lenza_backup.log${NC}"
echo -e "\n${YELLOW}What gets backed up:${NC}"
echo -e "  • PostgreSQL database (compressed)"
echo -e "  • Media files (images, uploads)"
echo -e "  • Environment configuration (.env)"
echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "  • View cron jobs: ${BLUE}crontab -l${NC}"
echo -e "  • View backup log: ${BLUE}tail -f /var/log/lenza_backup.log${NC}"
echo -e "  • List backups: ${BLUE}ls -lh $BACKUP_DIR${NC}"
echo -e "  • Manual backup: ${BLUE}bash $PROJECT_DIR/backup.sh${NC}"
echo -e "\n${YELLOW}To restore from backup:${NC}"
echo -e "  ${BLUE}gunzip -c $BACKUP_DIR/db_YYYYMMDD_HHMMSS.sql.gz | \\${NC}"
echo -e "  ${BLUE}docker exec -i lenza_db psql -U \$POSTGRES_USER \$POSTGRES_DB${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

exit 0
