#!/usr/bin/env bash
# ========================================
# Lenza ERP - Setup Helper Script
# Makes all deployment scripts executable
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Lenza ERP - Setup Helper${NC}"
echo -e "${BLUE}Making deployment scripts executable${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# List of scripts
SCRIPTS=(
    "server_install.sh"
    "deploy.sh"
    "update.sh"
    "backup.sh"
    "logs.sh"
    "health.sh"
    "setup.sh"
)

echo -e "${YELLOW}Setting executable permissions...${NC}\n"

# Make scripts executable
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        echo -e "${GREEN}✓${NC} $script"
    else
        echo -e "${YELLOW}⚠${NC} $script (not found, skipping)"
    fi
done

echo -e "\n${YELLOW}Setting executable permissions for entrypoint...${NC}\n"

# Backend entrypoint
if [ -f "backend/docker-entrypoint.sh" ]; then
    chmod +x backend/docker-entrypoint.sh
    echo -e "${GREEN}✓${NC} backend/docker-entrypoint.sh"
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Setup complete!${NC}\n"

echo -e "${CYAN}Available deployment scripts:${NC}\n"

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        case "$script" in
            "server_install.sh")
                echo -e "  ${BLUE}$script${NC} - VPS preparation (Docker, Nginx, SSL)"
                ;;
            "deploy.sh")
                echo -e "  ${BLUE}$script${NC} - Initial deployment"
                ;;
            "update.sh")
                echo -e "  ${BLUE}$script${NC} - Zero-downtime updates (blue/green)"
                ;;
            "backup.sh")
                echo -e "  ${BLUE}$script${NC} - Backup database and media"
                ;;
            "logs.sh")
                echo -e "  ${BLUE}$script${NC} - Interactive log viewer"
                ;;
            "health.sh")
                echo -e "  ${BLUE}$script${NC} - System health check"
                ;;
            "setup.sh")
                echo -e "  ${BLUE}$script${NC} - This setup script"
                ;;
        esac
    fi
done

echo -e "\n${YELLOW}Quick Start:${NC}\n"
echo -e "  ${CYAN}1.${NC} First time: ${BLUE}./server_install.sh${NC}"
echo -e "  ${CYAN}2.${NC} Deploy app: ${BLUE}./deploy.sh${NC}"
echo -e "  ${CYAN}3.${NC} Update app: ${BLUE}./update.sh${NC}"

echo -e "\n${YELLOW}Documentation:${NC}\n"
echo -e "  • Quick start: ${BLUE}QUICKSTART.md${NC}"
echo -e "  • Full guide: ${BLUE}DEPLOY_DOCKER_VPS.md${NC}"
echo -e "  • Checklist: ${BLUE}DEPLOYMENT_CHECKLIST.md${NC}"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

exit 0
