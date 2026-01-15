# ============================================
# Reversi Backend - NestJS WebSocket Server
# ============================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared types first (backend depends on these)
COPY shared ./shared

# Copy backend package files
COPY backend/package*.json ./backend/

# Install ALL dependencies first (needed for build)
WORKDIR /app/backend
RUN npm ci

# Copy backend source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build the application
RUN npm run build

# ============================================
# Production Stage - Clean install prod deps only
# ============================================
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nestjs -u 1001

# Update npm to fix cross-spawn and glob vulnerabilities in npm itself
RUN npm install -g npm@latest && npm cache clean --force

# Copy package files for production install
COPY backend/package*.json ./

# Install ONLY production dependencies (no devDependencies = no cross-spawn/glob)
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

# Switch to non-root user
USER nestjs

# Expose WebSocket port
EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server - path based on tsconfig rootDir=".." 
CMD ["node", "dist/backend/src/main.js"]
