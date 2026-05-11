# ============================================================
# Aura OS — Backend Container
# ============================================================
# Build context: project root  (docker compose uses context: ..)
# Runtime: Node 20 LTS Alpine (smallest stable image)
#
# Security:
#   - Runs as non-root user 'node'
#   - Production deps only (nodemon excluded via --omit=dev)
#   - Secrets injected at runtime via env vars, never baked in
#
# Usage:
#   docker compose up backend
#   docker build -f docker/backend.Dockerfile .
# ============================================================

ARG NODE_VERSION=20

# ─────────────────────────────────────────────────────────────
# Stage 1: deps — install production dependencies only
# Copies package files first for Docker layer caching.
# nodemon is in devDependencies → skipped by --omit=dev
# ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────
# Stage 2: runtime — lean production image
# ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy backend source
COPY backend/ .

# Run as non-root 'node' user (built into the official node image)
# WHY: reduces attack surface if the Express process is compromised
USER node

# Backend port — matches server.js PORT env var default (5000)
EXPOSE 5000

# Use 'node' not 'nodemon' — nodemon is not installed in production
# server.js is the Express entry point confirmed in backend/package.json
CMD ["node", "server.js"]
