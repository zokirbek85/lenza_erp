#!/usr/bin/env bash
# ========================================
# Lenza ERP - Health Check Script
# Verify system health and connectivity
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/opt/lenza_erp"
cd "$PROJECT_DIR"

# Get active stack
if [ -f "deploy/active_stack" ]; then
    STACK=$(cat deploy/active_stack)
else
    STACK="blue"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Lenza ERP - Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

check_container() {
    local name=$1
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        local status=$(docker inspect -f '{{.State.Status}}' "$name")
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✓${NC} $name: ${GREEN}running${NC}"
            return 0
        else
            echo -e "${RED}✗${NC} $name: ${RED}$status${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $name: ${RED}not found${NC}"
        return 1
    fi
}

check_http() {
    local url=$1
    local name=$2
    if curl -f -s -o /dev/null "$url"; then
        echo -e "${GREEN}✓${NC} $name: ${GREEN}accessible${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} $name: ${RED}unreachable${NC}"
        return 1
    fi
}

# Container checks
echo -e "${YELLOW}Container Status:${NC}"
check_container "lenza_db"
check_container "lenza_redis"
check_container "lenza_backend_${STACK}"
check_container "lenza_frontend_${STACK}"
echo

# Database connection
echo -e "${YELLOW}Database Connection:${NC}"
if docker exec lenza_db pg_isready -U lenza_user > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL: ${GREEN}accepting connections${NC}"
    
    # Check database size
    DB_SIZE=$(docker exec lenza_db psql -U lenza_user -d lenza_erp_db -t -c "SELECT pg_size_pretty(pg_database_size('lenza_erp_db'));" 2>/dev/null | xargs)
    echo -e "  Database size: ${BLUE}$DB_SIZE${NC}"
    
    # Check connections
    CONN_COUNT=$(docker exec lenza_db psql -U lenza_user -d lenza_erp_db -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
    echo -e "  Active connections: ${BLUE}$CONN_COUNT${NC}"
else
    echo -e "${RED}✗${NC} PostgreSQL: ${RED}not responding${NC}"
fi
echo

# Redis connection
echo -e "${YELLOW}Redis Connection:${NC}"
if docker exec lenza_redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis: ${GREEN}responding${NC}"
    
    # Check memory usage
    REDIS_MEM=$(docker exec lenza_redis redis-cli INFO memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    echo -e "  Memory usage: ${BLUE}$REDIS_MEM${NC}"
else
    echo -e "${RED}✗${NC} Redis: ${RED}not responding${NC}"
fi
echo

# Backend health endpoint
echo -e "${YELLOW}Backend Health:${NC}"
if docker exec "lenza_backend_${STACK}" curl -f -s http://localhost:8000/api/health/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API: ${GREEN}healthy${NC}"
else
    echo -e "${RED}✗${NC} Backend API: ${RED}unhealthy${NC}"
fi
echo

# Frontend check
echo -e "${YELLOW}Frontend Health:${NC}"
if docker exec "lenza_frontend_${STACK}" curl -f -s http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend: ${GREEN}serving${NC}"
else
    echo -e "${RED}✗${NC} Frontend: ${RED}not serving${NC}"
fi
echo

# Nginx status
echo -e "${YELLOW}Nginx Status:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} Nginx: ${GREEN}running${NC}"
    
    # Test config
    if nginx -t > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Nginx config: ${GREEN}valid${NC}"
    else
        echo -e "${RED}✗${NC} Nginx config: ${RED}invalid${NC}"
    fi
else
    echo -e "${RED}✗${NC} Nginx: ${RED}not running${NC}"
fi
echo

# External access
echo -e "${YELLOW}External Access:${NC}"

# Load domain from .env
if [ -f ".env" ]; then
    source .env
    DOMAIN=$(echo "$DJANGO_ALLOWED_HOSTS" | cut -d, -f1)
    
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
        check_http "https://${DOMAIN}/api/health/" "Public API"
        check_http "https://${DOMAIN}/" "Public Frontend"
    else
        echo -e "${YELLOW}⚠${NC} No public domain configured"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env file not found"
fi
echo

# Disk space
echo -e "${YELLOW}Disk Space:${NC}"
df -h / | awk 'NR==2 {
    used = $5
    gsub(/%/, "", used)
    if (used < 80)
        print "\033[0;32m✓\033[0m Root: " $5 " used (" $4 " available)"
    else if (used < 90)
        print "\033[1;33m⚠\033[0m Root: " $5 " used (" $4 " available)"
    else
        print "\033[0;31m✗\033[0m Root: " $5 " used (" $4 " available) - LOW SPACE!"
}'
echo

# Docker volumes
echo -e "${YELLOW}Docker Volumes:${NC}"
docker volume ls | grep lenza | while read -r driver name; do
    size=$(docker system df -v | grep "$name" | awk '{print $3}')
    echo -e "  • ${BLUE}$name${NC}: $size"
done
echo

# SSL certificate
echo -e "${YELLOW}SSL Certificate:${NC}"
if [ -f ".env" ]; then
    source .env
    DOMAIN=$(echo "$DJANGO_ALLOWED_HOSTS" | cut -d, -f1)
    
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/cert.pem" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/cert.pem" | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
        
        if [ $DAYS_LEFT -gt 30 ]; then
            echo -e "${GREEN}✓${NC} SSL certificate: ${GREEN}valid${NC} ($DAYS_LEFT days left)"
        elif [ $DAYS_LEFT -gt 7 ]; then
            echo -e "${YELLOW}⚠${NC} SSL certificate: ${YELLOW}expires soon${NC} ($DAYS_LEFT days left)"
        else
            echo -e "${RED}✗${NC} SSL certificate: ${RED}expires very soon!${NC} ($DAYS_LEFT days left)"
        fi
    else
        echo -e "${YELLOW}⚠${NC} SSL certificate: ${YELLOW}not found${NC}"
    fi
fi
echo

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Health check complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

exit 0
