# ============================================
# Reversi - Production Build
# Multi-stage build for Angular frontend with Nginx
# ============================================

# ============================================
# Stage 1: Build Angular Application
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline

# Copy source code
COPY . .

# Build the Angular application for production
RUN npm run build -- --configuration production

# ============================================
# Stage 2: Production with Nginx
# ============================================
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular application
# Angular 17+ outputs to dist/project-name/browser
COPY --from=frontend-builder /app/dist/reversi-app/browser /usr/share/nginx/html

# Create a non-root user for security
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

# Expose HTTP port (Azure Container Apps handles HTTPS termination)
EXPOSE 80

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
