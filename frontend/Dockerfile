# ========================================
# Lenza ERP Frontend Dockerfile
# Multi-stage build: Node build + Nginx serve
# Production-ready with runtime env injection
# ========================================

# Stage 1: Build React/Vite application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

RUN apk add --no-cache git

# Copy package files first (for layer caching)
COPY package.json ./
COPY package-lock.json* ./

# Debug: Check if package-lock.json exists and is valid
RUN echo "=== Checking for package-lock.json ===" && \
    ls -lah package* && \
    if [ -f package-lock.json ]; then \
      echo "package-lock.json found, size: $(wc -c < package-lock.json) bytes" && \
      echo "First 10 lines:" && \
      head -10 package-lock.json && \
      echo "Checking lockfileVersion with npm..." && \
      node -e "try { const pkg = require('./package-lock.json'); console.log('lockfileVersion:', pkg.lockfileVersion); } catch(e) { console.log('Error reading lock file:', e.message); }" \
    else \
      echo "package-lock.json not found"; \
    fi

# Install dependencies with production optimizations
# Always use npm install to avoid npm ci issues
RUN echo "Installing dependencies with npm install..." && \
    npm install --prefer-offline --no-audit --production=false

# Copy source code (including .env.production for Vite)
COPY . .

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=https://erp.lenza.uz
ENV VITE_API_URL=$VITE_API_URL

# Set NODE_ENV to production so Vite uses .env.production
ENV NODE_ENV=production

# Build the production bundle
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.html || (echo "Build failed: no index.html" && exit 1)

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.default

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create runtime environment injection script
# This allows changing VITE_API_URL at container start without rebuilding
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-env.sh && \
    echo 'set -e' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'if [ -n "$VITE_API_URL" ]; then' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  echo "Injecting VITE_API_URL: $VITE_API_URL"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|__VITE_API_URL__|'\''${VITE_API_URL}'\''|g" {} +' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-inject-env.sh && \
    chmod +x /docker-entrypoint.d/40-inject-env.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Nginx will be started by the base image's entrypoint
# The CMD is already set in nginx:alpine base image
