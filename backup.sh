#!/usr/bin/env bash
# ========================================
# Lenza ERP - Backup Script
# Automated database and media backups
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/root/lenza_backups"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/opt/lenza_erp"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Lenza ERP - Backup Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Load environment
cd "$PROJECT_DIR"
source .env

echo -e "${GREEN}Starting backup: $DATE${NC}\n"

# Database backup
echo -e "${YELLOW}[1/3]${NC} Backing up database..."
docker exec lenza_db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | \
    gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

DB_SIZE=$(du -h "$BACKUP_DIR/db_$DATE.sql.gz" | cut -f1)
echo -e "${GREEN}✓ Database backed up: $DB_SIZE${NC}\n"

# Media files backup
echo -e "${YELLOW}[2/3]${NC} Backing up media files..."
if [ -d "/var/www/lenza_erp/media" ]; then
    tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" \
        -C /var/www/lenza_erp media/ 2>/dev/null || true
    MEDIA_SIZE=$(du -h "$BACKUP_DIR/media_$DATE.tar.gz" | cut -f1)
    echo -e "${GREEN}✓ Media files backed up: $MEDIA_SIZE${NC}\n"
else
    echo -e "${YELLOW}⚠ No media files found${NC}\n"
fi

# .env backup
echo -e "${YELLOW}[3/3]${NC} Backing up configuration..."
cp "$PROJECT_DIR/.env" "$BACKUP_DIR/env_$DATE"
chmod 600 "$BACKUP_DIR/env_$DATE"
echo -e "${GREEN}✓ Configuration backed up${NC}\n"

# Cleanup old backups
echo -e "${YELLOW}Cleaning up old backups (keeping last $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_*" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✓ Cleanup complete${NC}\n"

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Backup Complete!${NC}\n"
echo -e "Backup location: ${BLUE}$BACKUP_DIR${NC}"
echo -e "Files created:"
echo -e "  • db_$DATE.sql.gz ($DB_SIZE)"
if [ -f "$BACKUP_DIR/media_$DATE.tar.gz" ]; then
    echo -e "  • media_$DATE.tar.gz ($MEDIA_SIZE)"
fi
echo -e "  • env_$DATE"
echo -e "\n${YELLOW}To restore:${NC}"
echo -e "  ${BLUE}docker exec -i lenza_db psql -U $POSTGRES_USER $POSTGRES_DB < <(gunzip -c $BACKUP_DIR/db_$DATE.sql.gz)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Log backup
echo "$(date) - Backup completed: $DATE" >> /var/log/lenza_backup.log

exit 0
