# 🐳 Aura OS — Docker Architecture

Containerization layer for the Aura OS full-stack behavioral operating system.

> **Deployment note:** Production cloud deployment remains on **Netlify** (frontend) and **Render** (backend). Docker is for local orchestration and CO3 CI/CD compliance.

---

## Prerequisites

| Tool | Version |
|---|---|
| Docker Desktop | 24+ |
| Docker Compose | v2 (included with Docker Desktop) |

---

## First-Time Setup

```bash
# 1. Clone and enter the project
cd smart-task-manager

# 2. Create your local Docker environment file
cp docker/.env.example docker/.env

# 3. Edit docker/.env — add your MongoDB Atlas URI
#    MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/aura_os
```

> ⚠️ Never commit `docker/.env`. It is already git-ignored.

---

## Running in Development Mode (Hot Reload)

```bash
cd docker
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (Vite dev server) | http://localhost:5173 |
| Backend (Express REST API) | http://localhost:5000 |

- Frontend hot reload is active — edit files in `frontend/src/` and changes reflect instantly.
- Backend restarts require `docker compose restart backend`.
- The Vite dev proxy forwards `/api/*` requests to the `backend` container automatically.

---

## Running in Production Mode (nginx)

```bash
cd docker
docker compose --profile prod up --build
```

| Service | URL |
|---|---|
| Frontend (nginx, pre-built) | http://localhost:8080 |
| Backend (Express REST API) | http://localhost:5000 |

The production frontend image is a static nginx container. Vite env vars are **baked in at build time** from `docker/.env`.

---

## Useful Commands

```bash
# Start in background (detached)
docker compose up -d

# View live logs
docker compose logs -f

# View logs for one service
docker compose logs -f backend

# Stop and remove containers (keeps volumes)
docker compose down

# Stop and remove containers + volumes
docker compose down -v

# Rebuild a single service
docker compose up --build backend

# Open a shell inside the backend container
docker compose exec backend sh

# Open a shell inside the frontend container
docker compose exec frontend sh
```

---

## Architecture

```
docker/
├── frontend.Dockerfile      # Multi-stage: dev (Vite) → builder → prod (nginx)
├── backend.Dockerfile       # Single stage: Node 20 Alpine, non-root user
├── frontend.dockerignore    # Excludes node_modules, dist, .env, backend/
├── backend.dockerignore     # Excludes node_modules, venv, cv/, .env, frontend/
├── docker-compose.yml       # Orchestrates frontend + backend services
├── nginx.conf               # SPA routing, cache headers, gzip
├── .env.example             # Template — copy to .env and fill in secrets
└── README.md                # This file
```

### Network

Both containers share an internal Docker bridge network (`aura-network`). The frontend container reaches the backend by service name: `http://backend:5000`. The Vite dev proxy strips `/api` and forwards to the backend container transparently.

### Volumes (dev mode only)

```
../frontend  →  /app   (source sync for hot reload)
/app/node_modules       (anonymous volume — protects container's own install)
```

---

## Environment Variables

### Backend (runtime)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `NODE_ENV` | auto | Set to `development` by compose |
| `PORT` | auto | Defaults to `5000` |
| `FRONTEND_URL` | auto | Set to `http://localhost:5173` by compose |

### Frontend (dev: runtime via Vite, prod: build-time)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g. `http://backend:5000/api`) |
| `VITE_CV_URL` | CV service URL (local-only, not containerized) |
| `VITE_DEBUG` | Enable verbose logging (`false` in production) |

---

## Computer Vision (OpenCV)

The OpenCV/FastAPI CV subsystem is intentionally **not containerized** — it requires direct access to the host camera hardware which cannot be reliably passed through Docker on all platforms (especially macOS and Windows).

The frontend's `DisciplineMode` automatically detects the environment and disables CV features when not running on `localhost` with the CV service active.

To use CV locally:
```bash
# In a separate terminal (outside Docker)
cd backend/cv
source ../venv/bin/activate   # or venv\Scripts\activate on Windows
uvicorn main:app --reload --port 8000
```

---

## Troubleshooting

### Frontend can't reach backend
- Verify both containers are on `aura-network`: `docker network inspect docker_aura-network`
- Check backend health: `docker compose ps` — backend should show `healthy`

### MongoDB connection refused
- Ensure `MONGO_URI` in `docker/.env` is the correct Atlas connection string
- Verify your Atlas cluster allows connections from `0.0.0.0/0` or your current IP

### Vite hot reload not working
- Ensure the volume mount `../frontend:/app` is active: `docker compose config`
- On Windows with WSL2: move the project inside the WSL2 filesystem for best inotify performance

### Port already in use
```bash
# Find what's using port 5000
netstat -ano | findstr :5000   # Windows
lsof -i :5000                  # macOS/Linux
```

### Rebuilding cleanly after dependency changes
```bash
docker compose down
docker compose up --build
```

---

## Coexistence with Netlify / Render

Docker does not interfere with the existing cloud deployment. The Netlify and Render configs (`vercel.json`, Render dashboard settings, `.env.production`) are entirely separate. Docker is for **local orchestration only**.

| Environment | Frontend | Backend |
|---|---|---|
| Local (no Docker) | `npm run dev` on :5173 | `npm run dev` on :5000 |
| Local (Docker) | container on :5173 | container on :5000 |
| Production | Netlify | Render |
