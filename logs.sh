#!/usr/bin/env bash
# ========================================
# Lenza ERP - Log Viewer Script
# Quick access to container logs
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
echo -e "${BLUE}Lenza ERP - Log Viewer${NC}"
echo -e "${BLUE}Active Stack: ${GREEN}$STACK${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "Select logs to view:\n"
echo -e "  ${CYAN}1${NC} - Backend ($STACK stack)"
echo -e "  ${CYAN}2${NC} - Frontend ($STACK stack)"
echo -e "  ${CYAN}3${NC} - Database"
echo -e "  ${CYAN}4${NC} - Redis"
echo -e "  ${CYAN}5${NC} - All active stack containers"
echo -e "  ${CYAN}6${NC} - Nginx access logs"
echo -e "  ${CYAN}7${NC} - Nginx error logs"
echo -e "  ${CYAN}8${NC} - Docker daemon logs"
echo -e "\n  ${YELLOW}0${NC} - Exit"

echo -e "\n${YELLOW}Choose option [1-8]:${NC} "
read -r choice

case $choice in
    1)
        echo -e "\n${GREEN}Backend logs (Ctrl+C to exit):${NC}\n"
        docker logs lenza_backend_${STACK} -f --tail 100
        ;;
    2)
        echo -e "\n${GREEN}Frontend logs (Ctrl+C to exit):${NC}\n"
        docker logs lenza_frontend_${STACK} -f --tail 100
        ;;
    3)
        echo -e "\n${GREEN}Database logs (Ctrl+C to exit):${NC}\n"
        docker logs lenza_db -f --tail 100
        ;;
    4)
        echo -e "\n${GREEN}Redis logs (Ctrl+C to exit):${NC}\n"
        docker logs lenza_redis -f --tail 100
        ;;
    5)
        echo -e "\n${GREEN}All active stack logs (Ctrl+C to exit):${NC}\n"
        docker compose -f "deploy/docker-compose.${STACK}.yml" logs -f --tail 50
        ;;
    6)
        echo -e "\n${GREEN}Nginx access logs (Ctrl+C to exit):${NC}\n"
        tail -f /var/log/nginx/access.log
        ;;
    7)
        echo -e "\n${GREEN}Nginx error logs (Ctrl+C to exit):${NC}\n"
        tail -f /var/log/nginx/error.log
        ;;
    8)
        echo -e "\n${GREEN}Docker daemon logs (Ctrl+C to exit):${NC}\n"
        journalctl -u docker -f
        ;;
    0)
        echo -e "\n${YELLOW}Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "\n${RED}Invalid option${NC}"
        exit 1
        ;;
esac
