# ========================================
# Lenza ERP Frontend Dockerfile
# Multi-stage build: Node build + Nginx serve
# Production-ready with runtime env injection
# ========================================

# Stage 1: Build React/Vite application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package.json package-lock.json* ./

# Install dependencies with production optimizations
RUN npm ci --prefer-offline --no-audit --production=false

# Copy source code
COPY . .

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=https://erp.lenza.uz
ENV VITE_API_URL=$VITE_API_URL

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
    echo '  find /usr/share/nginx/html -type f -name "*.js" -exec sed -i' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '    "s|__VITE_API_URL__|${VITE_API_URL}|g" {} +' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-inject-env.sh && \
    chmod +x /docker-entrypoint.d/40-inject-env.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Nginx will be started by the base image's entrypoint
# The CMD is already set in nginx:alpine base image
