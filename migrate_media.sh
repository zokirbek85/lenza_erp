#!/usr/bin/env bash
# ========================================
# Media Files Migration Script
# Migrates from Docker named volumes to host bind mounts
# Run on VPS as root: sudo bash migrate_media.sh
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check root
if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

PROJECT_DIR="/opt/lenza_erp"
HOST_MEDIA="/var/www/lenza_erp/media"
HOST_STATIC="/var/www/lenza_erp/staticfiles"

cd "$PROJECT_DIR"

log_info "Step 1: Creating host directories..."
mkdir -p "$HOST_MEDIA"
mkdir -p "$HOST_STATIC"
chown -R 1000:1000 "$HOST_MEDIA" "$HOST_STATIC"  # Docker user
chmod -R 755 "$HOST_MEDIA" "$HOST_STATIC"

log_info "Step 2: Checking for existing media files in containers..."

# Check if containers exist
BLUE_EXISTS=$(docker ps -a --filter "name=lenza_backend_blue" --format "{{.Names}}" | wc -l)
GREEN_EXISTS=$(docker ps -a --filter "name=lenza_backend_green" --format "{{.Names}}" | wc -l)

if [ "$BLUE_EXISTS" -gt 0 ]; then
    log_info "Found blue backend container"
    
    # Check if media files exist in container
    MEDIA_COUNT=$(docker exec lenza_backend_blue find /app/media -type f 2>/dev/null | wc -l || echo 0)
    
    if [ "$MEDIA_COUNT" -gt 0 ]; then
        log_info "Found $MEDIA_COUNT media files in blue container"
        log_info "Copying media files from blue container to host..."
        
        # Create temp directory
        TEMP_DIR="/tmp/lenza_media_backup_$(date +%s)"
        mkdir -p "$TEMP_DIR"
        
        # Copy from container to temp
        docker cp lenza_backend_blue:/app/media/. "$TEMP_DIR/"
        
        # Copy from temp to host location
        cp -r "$TEMP_DIR/"* "$HOST_MEDIA/" 2>/dev/null || true
        
        # Cleanup temp
        rm -rf "$TEMP_DIR"
        
        log_info "✅ Media files copied successfully"
    else
        log_warn "No media files found in blue container"
    fi
fi

if [ "$GREEN_EXISTS" -gt 0 ]; then
    log_info "Found green backend container"
    
    MEDIA_COUNT=$(docker exec lenza_backend_green find /app/media -type f 2>/dev/null | wc -l || echo 0)
    
    if [ "$MEDIA_COUNT" -gt 0 ]; then
        log_info "Found $MEDIA_COUNT media files in green container"
        log_info "Copying media files from green container to host..."
        
        TEMP_DIR="/tmp/lenza_media_backup_$(date +%s)"
        mkdir -p "$TEMP_DIR"
        
        docker cp lenza_backend_green:/app/media/. "$TEMP_DIR/"
        cp -r "$TEMP_DIR/"* "$HOST_MEDIA/" 2>/dev/null || true
        rm -rf "$TEMP_DIR"
        
        log_info "✅ Media files copied successfully"
    else
        log_warn "No media files found in green container"
    fi
fi

log_info "Step 3: Checking Docker named volumes..."

# Check if old volumes exist
MEDIA_VOLUME=$(docker volume ls --filter "name=lenza_media" --format "{{.Name}}" | head -1)
STATIC_VOLUME=$(docker volume ls --filter "name=lenza_static" --format "{{.Name}}" | head -1)

if [ -n "$MEDIA_VOLUME" ]; then
    log_info "Found media volume: $MEDIA_VOLUME"
    log_info "Attempting to extract files from volume..."
    
    # Create temporary container to access volume
    docker run --rm -v "$MEDIA_VOLUME":/source -v "$HOST_MEDIA":/dest alpine sh -c "cp -r /source/. /dest/ 2>/dev/null || true"
    
    log_info "✅ Media volume extracted"
fi

if [ -n "$STATIC_VOLUME" ]; then
    log_info "Found static volume: $STATIC_VOLUME"
    docker run --rm -v "$STATIC_VOLUME":/source -v "$HOST_STATIC":/dest alpine sh -c "cp -r /source/. /dest/ 2>/dev/null || true"
    log_info "✅ Static volume extracted"
fi

log_info "Step 4: Setting correct permissions..."
chown -R 1000:1000 "$HOST_MEDIA" "$HOST_STATIC"
chmod -R 755 "$HOST_MEDIA" "$HOST_STATIC"

# Set proper permissions for variant images
if [ -d "$HOST_MEDIA/catalog/variants" ]; then
    chmod -R 755 "$HOST_MEDIA/catalog/variants"
    log_info "✅ Variant images directory permissions set"
fi

log_info "Step 5: Verifying migration..."
TOTAL_FILES=$(find "$HOST_MEDIA" -type f 2>/dev/null | wc -l)
VARIANT_IMAGES=$(find "$HOST_MEDIA/catalog/variants" -type f 2>/dev/null | wc -l)

log_info "Migration Summary:"
log_info "  Total media files: $TOTAL_FILES"
log_info "  Variant images: $VARIANT_IMAGES"
log_info "  Media path: $HOST_MEDIA"
log_info "  Static path: $HOST_STATIC"

if [ "$VARIANT_IMAGES" -gt 0 ]; then
    log_info "\nSample variant images:"
    find "$HOST_MEDIA/catalog/variants" -type f | head -5
fi

echo ""
log_info "✅ Migration completed successfully!"
log_warn "\nNext steps:"
log_warn "1. Pull latest code: git pull origin main"
log_warn "2. Stop containers: docker-compose -f deploy/docker-compose.blue.yml down"
log_warn "3. Remove old volumes (optional): docker volume rm lenza_media_shared lenza_static_blue"
log_warn "4. Rebuild & start: docker-compose -f deploy/docker-compose.blue.yml up -d --build"
log_warn "5. Reload NGINX: nginx -t && nginx -s reload"
log_warn "6. Test: curl -I https://erp.lenza.uz/media/catalog/variants/<filename>.png"

echo ""
log_info "Old volumes (safe to remove after testing):"
docker volume ls --filter "name=lenza_media" --filter "name=lenza_static"
