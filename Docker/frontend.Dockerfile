# ============================================================
# Aura OS — Frontend Container
# ============================================================
# Build context: project root  (docker compose uses context: ..)
# Stages:
#   dev     — Vite dev server with hot reload (default for compose)
#   builder — production static build
#   prod    — nginx serving the static dist/ (production image)
#
# Usage examples:
#   docker compose up                         # dev stage (hot reload)
#   docker compose --profile prod up          # prod stage (nginx)
#   docker build --target prod -f docker/frontend.Dockerfile .
# ============================================================

ARG NODE_VERSION=20

# ─────────────────────────────────────────────────────────────
# Stage 1: deps — install Node deps (cached layer)
# Copies only package files first so npm ci only reruns when
# dependencies actually change, not on every source change.
# ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app

# Copy package manifests from the frontend/ subdirectory.
# package-lock.json* uses glob so it doesn't fail if missing.
COPY frontend/package.json frontend/package-lock.json* ./

# Install ALL deps (devDeps needed: Vite, ESLint plugins, etc.)
RUN npm ci

# ─────────────────────────────────────────────────────────────
# Stage 2: dev — Vite dev server with hot reload
# Volume-mount src/ from host so edits reflect instantly.
# ─────────────────────────────────────────────────────────────
FROM deps AS dev
WORKDIR /app

# Copy full frontend source (overridden by volume mount in compose)
COPY frontend/ .

# --host 0.0.0.0  → makes Vite reachable outside the container
# --port 5173     → consistent with vite.config.js server.port
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ─────────────────────────────────────────────────────────────
# Stage 3: builder — production static build
# VITE_* args are passed at build time via docker compose build
# args section and baked into the JS bundle by Vite.
# ─────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY frontend/ .

# Build-time env vars — passed via compose build.args or CLI --build-arg
ARG VITE_API_URL
ARG VITE_CV_URL
ARG VITE_DEBUG=false

# Expose as ENV so Vite's import.meta.env picks them up during build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_CV_URL=${VITE_CV_URL}
ENV VITE_DEBUG=${VITE_DEBUG}

RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 4: prod — serve built assets with nginx
# Minimal alpine image: no Node runtime, no source code.
# ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS prod

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config: SPA routing + correct cache headers
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
