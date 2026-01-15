# ============================================
# Reversi Backend - NestJS WebSocket Server
# ============================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared types first (backend depends on these)
COPY shared ./shared

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci

# Copy backend source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build the application
RUN npm run build

# Prune devDependencies for production (removes cross-spawn, glob vulnerabilities from ts-node)
RUN npm prune --production

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nestjs -u 1001

# Copy built application and dependencies
# Note: rootDir is ".." so dist includes backend/src structure
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./

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
