#!/usr/bin/env bash
# ========================================
# Lenza ERP - VPS Installation Script
# Prepares Ubuntu 24.04 server for Docker deployment
# Run as root on fresh VPS
# ========================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/lenza_erp"
REPO_URL="https://github.com/zokirbek85/lenza_erp.git"
DOMAIN="erp.lenza.uz"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

log_step "1. System Update and Package Installation"

# Update system packages
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https

log_step "2. Install Docker"

# Remove old Docker versions if any
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
log_info "Adding Docker GPG key..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up Docker repository
log_info "Adding Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
log_info "Installing Docker Engine..."
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Verify Docker installation
docker --version
docker compose version

log_info "Docker installed successfully"

log_step "3. Install Nginx"

# Install Nginx
log_info "Installing Nginx..."
apt install -y nginx

# Stop and disable Nginx (will be configured and started by deploy.sh)
systemctl stop nginx
systemctl disable nginx

log_step "4. Install Certbot for SSL"

# Install Certbot
log_info "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

log_step "5. Configure Firewall (UFW)"

# Reset UFW to default
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
log_info "Configuring firewall rules..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable UFW
ufw --force enable

# Show status
ufw status verbose

log_step "6. Clone/Update Project Repository"

# Create project directory
mkdir -p "$PROJECT_DIR"

# Clone or update repository
if [ -d "$PROJECT_DIR/.git" ]; then
    log_info "Repository already exists, pulling latest changes..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    log_info "Cloning repository..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

log_step "7. Create Required Directories"

# Create necessary directories
log_info "Creating application directories..."
mkdir -p "$PROJECT_DIR/backend/logs"
mkdir -p "$PROJECT_DIR/backend/staticfiles"
mkdir -p "$PROJECT_DIR/backend/media"
mkdir -p /var/www/lenza_erp/staticfiles
mkdir -p /var/www/lenza_erp/media
mkdir -p /var/www/certbot

# Set permissions
chown -R www-data:www-data /var/www/lenza_erp
chmod -R 755 /var/www/lenza_erp

log_step "8. Generate Environment Configuration"

# Check if .env exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    log_info "Creating .env file from .env.example..."
    
    # Copy example file
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    
    # Generate Django secret key
    log_info "Generating Django SECRET_KEY..."
    DJANGO_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    sed -i "s/your-super-secret-key-here-min-50-characters-CHANGE-THIS/$DJANGO_SECRET/" "$PROJECT_DIR/.env"
    
    # Generate database password
    log_info "Generating database password..."
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    sed -i "s/your-secure-database-password-CHANGE-THIS/$DB_PASSWORD/" "$PROJECT_DIR/.env"
    
    # Set correct domain
    sed -i "s/erp.lenza.uz/$DOMAIN/g" "$PROJECT_DIR/.env"
    
    log_info ".env file created with secure generated secrets"
    log_warn "Review and edit $PROJECT_DIR/.env if needed"
else
    log_info ".env file already exists, skipping generation"
fi

# Set secure permissions on .env
chmod 600 "$PROJECT_DIR/.env"

log_step "9. Prepare Nginx Configuration"

# Copy Nginx config files (but don't enable yet)
log_info "Copying Nginx configuration files..."
cp "$PROJECT_DIR/deploy/nginx/erp.lenza.uz.conf" /etc/nginx/sites-available/erp.lenza.uz
cp "$PROJECT_DIR/deploy/nginx/active_upstream.conf" /etc/nginx/conf.d/active_upstream.conf

# Remove default Nginx site
rm -f /etc/nginx/sites-enabled/default

# Don't create symlink yet - will be done in deploy.sh after containers are running
log_info "Nginx configuration prepared (will be enabled during deployment)"

log_step "10. Docker Network Setup"

# Create Docker network if it doesn't exist
log_info "Creating Docker network..."
docker network create lenza_network 2>/dev/null || log_info "Docker network already exists"

log_step "11. Installation Complete!"

cat << EOF

${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${GREEN}✓ VPS Installation Completed Successfully!${NC}
${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BLUE}Installation Summary:${NC}
  • Docker and Docker Compose installed
  • Nginx installed (will be configured by deploy.sh)
  • Certbot installed for SSL
  • Firewall (UFW) configured
  • Project cloned to: ${PROJECT_DIR}
  • Environment file created: ${PROJECT_DIR}/.env
  • Docker network created

${YELLOW}Next Steps:${NC}
  1. Review and edit environment variables:
     ${BLUE}nano ${PROJECT_DIR}/.env${NC}

  2. Ensure your domain DNS is pointing to this server:
     ${BLUE}${DOMAIN} → 45.138.159.195${NC}

  3. Run the initial deployment:
     ${BLUE}cd ${PROJECT_DIR} && ./deploy.sh${NC}

  4. The deploy script will:
     • Build Docker images
     • Start containers
     • Run migrations
     • Request SSL certificate
     • Start the application

${YELLOW}Important:${NC}
  • Review $PROJECT_DIR/.env and update any values as needed
  • Ensure DNS is properly configured before running deploy.sh
  • The deployment will be available at: https://${DOMAIN}

${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

EOF

log_info "Installation log saved to /var/log/lenza_install.log"

# Save installation info
cat > /root/lenza_install_info.txt << EOF
Lenza ERP Installation
=====================
Date: $(date)
Project Directory: $PROJECT_DIR
Domain: $DOMAIN
Docker Version: $(docker --version)
Docker Compose Version: $(docker compose version)

Next: cd $PROJECT_DIR && ./deploy.sh
EOF

exit 0
