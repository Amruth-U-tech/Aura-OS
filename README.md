# Aura OS

Aura OS is a gamified productivity web app. It combines task management and progression mechanics with focus and daily-routine screens, a browser-based companion, sound effects, and an optional local computer-vision exercise tracker. This repository is a prototype; the checked-in implementation is not a distributed or multiplayer platform.

[![Live frontend](https://img.shields.io/badge/Frontend-Netlify-00C7B7)](https://aura-osv1.netlify.app)

## What is implemented

- Task creation, editing, deletion, completion, category/priority filtering, and deadline tracking through an Express REST API.
- MongoDB persistence with two Mongoose models: `Task` and `Progression`. The current progression record uses a shared `default_user` identity; user authentication and per-user accounts are not implemented.
- Server-side XP awards by priority, an early-deadline bonus, streak multipliers, failure penalties, and recovery/decay state. The streak multiplier ranges from 5% to a 30% cap.
- Focus and discipline modes, a local-time daily routine, behavioral keyword-based companion responses, and Howler.js audio feedback.
- An installable PWA shell with a service worker that caches static files. API traffic is not cached for offline writes or queued synchronization.
- Optional webcam exercise tracking for pushups, situps, and squats using Python, OpenCV, and MediaPipe. The React discipline screen calls a separate local FastAPI process on port 8000. Production disables camera calls and uses manual quest completion.
- Express middleware for Helmet security headers, a 100-request-per-IP/15-minute API limiter, JSON payload limits, input sanitization, and an explicit CORS origin allowlist.

## Current implementation facts

| Area | Repository evidence |
|---|---|
| Express routes | 6 method handlers: 5 task endpoints and `POST /api/cv/start` |
| MongoDB models | 2: `Task` and `Progression` |
| Socket.IO listeners | 0; the frontend `EventBus` is an in-process browser event bus |
| Backend schedulers | 0; the daily routine timer runs in the browser |
| Automated tests | No test script or test suite is currently defined in either package |

The backend `POST /api/cv/start` subprocess endpoint is distinct from the FastAPI webcam service used by the discipline screen. The webcam path requires local Python dependencies, a camera, and a running FastAPI app. Docker does not provide camera access or the Python CV runtime.

## Tech stack

- **Frontend:** React 19, Vite 8, Framer Motion, Axios, Howler.js, React Icons
- **API:** Node.js ES modules, Express 5, Mongoose, MongoDB
- **Computer vision:** Python, OpenCV, MediaPipe, NumPy, FastAPI (see CV setup)
- **Deployment/configuration:** Dockerfiles, Docker Compose, Nginx configuration, and a hosted Netlify frontend

## Run locally

### Prerequisites

- Node.js and npm compatible with the versions in the package lockfiles
- MongoDB, either local or a MongoDB connection string
- Python and a webcam only for the optional CV tracker

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/aura_os_dev
```

Then start the API:

```bash
npm run dev
```

The API listens on `http://localhost:5000`. Its CORS allowlist currently includes `https://aura-osv1.netlify.app`, `http://localhost:4173`, and `http://localhost:5173`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` and proxies `/api` to the local API. To check a production build, run `npm run build`; `npm run preview` serves that build, normally at `http://localhost:4173`.

### Optional webcam tracker

The tracker is a separate local service. Install the packages listed in `backend/requirements.txt` in a Python virtual environment and install FastAPI/Uvicorn separately. From the repository root, start the app with:

```bash
python -m uvicorn backend.cv.cv_router:app --reload --port 8000
```

Grant camera access to the browser and operating system. The current FastAPI module enables permissive CORS; use only in a trusted local development environment. Webcam tracking is not available in the deployed frontend.

## API overview

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tasks` | List tasks; supports `completed`, `category`, and `priority` query filters |
| `POST` | `/api/tasks` | Create a task |
| `PUT` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `PATCH` | `/api/tasks/:id/toggle` | Toggle completion and progression |
| `POST` | `/api/cv/start` | Start one of the Node-managed exercise subprocesses |

The FastAPI webcam service separately exposes `POST /start`, `GET /status`, `GET /video_feed`, and `POST /stop` on port 8000. These are not Express routes.

## Checks

The frontend package provides `npm run lint` and `npm run build`. The backend package currently has no test script, and the repository does not include an automated test suite. No test/assertion count is claimed here.

## Deployment and operational notes

- The live frontend link is [aura-osv1.netlify.app](https://aura-osv1.netlify.app). Backend deployment settings and availability are managed separately from this repository.
- Frontend API requests use `VITE_API_URL` when configured; otherwise the source falls back to `https://aura-os-d88w.onrender.com/api`.
- Docker assets are under `Docker/`. Review the Docker Compose configuration and `Docker/README.md` before using it; the local CV webcam service is not included in the containers.
- Never put database credentials in README files, example files, or commits. Use ignored local environment files and rotate any credential that has been committed.
