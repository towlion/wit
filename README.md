# WIT - Work Item Tracker

A Kanban-style work item tracker for small teams, built on the [Towlion platform](https://github.com/towlion/platform).

**Live instance:** https://wit.anulectra.com

## Features

- Workspaces and projects with role-based access (owner, admin, member, guest)
- Kanban board with drag-and-drop ordering
- 3 project templates: Software, Home, Event
- Activity timeline and comments on work items
- Due dates with calendar view
- Full-text search (Cmd+K)
- Custom fields (text, number, date, select, checkbox)
- File attachments via S3/MinIO
- Guest invitations with shareable token links
- In-app notifications and outgoing webhooks
- Keyboard shortcuts (press `?` to view)

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Database:** PostgreSQL (full-text search via tsvector)
- **Storage:** MinIO (S3-compatible)
- **Deploy:** Docker, Docker Compose, Caddy

## Project Structure

```
app/                    # FastAPI backend
  main.py               # Application entry point
  models.py             # SQLAlchemy models
  routers/              # API route modules
  activity.py           # Activity recording helpers
  notifications.py      # Notification + webhook dispatch
  storage.py            # S3/MinIO client
  alembic/              # Database migrations (0001-0008)
  Dockerfile
frontend/               # Next.js frontend
  app/                  # Pages (workspaces, login, register, invite)
  components/           # UI components (Board, Card, SearchModal, etc.)
  lib/                  # API client, hooks, utilities
  Dockerfile
deploy/
  docker-compose.yml    # Multi-app mode (connects to shared services)
  docker-compose.standalone.yml  # Full stack (self-hosted)
  Caddyfile             # Reverse proxy config
  env.template          # Environment variable reference
scripts/
  health-check.sh       # Deployment health check
docs/
  api.md                # API reference
```

## Local Development

### Backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set required env vars (or create deploy/.env)
export DATABASE_URL=postgresql://user:pass@localhost:5432/wit_db
export JWT_SECRET=dev-secret

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on port 3000 and proxies API calls to the backend on port 8000.

### Verify

```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `JWT_EXPIRY_HOURS` | No | Token expiry (default: 72) |
| `REDIS_URL` | No | Redis connection string |
| `S3_ENDPOINT` | Yes | MinIO/S3 endpoint URL |
| `S3_ACCESS_KEY` | Yes | S3 access key |
| `S3_SECRET_KEY` | Yes | S3 secret key |
| `S3_BUCKET` | Yes | S3 bucket name for attachments |

## API Overview

All endpoints are under `/api`. Authentication via JWT Bearer token unless noted.

| Group | Endpoints | Description |
|---|---|---|
| **Auth** | `POST /auth/register`, `/auth/login`, `GET /auth/me` | Registration, login, current user |
| **Workspaces** | CRUD + member management | Create, update, delete workspaces; add/remove members |
| **Projects** | CRUD under workspace | Projects with templates and workflow states |
| **Work Items** | CRUD + assignees + labels | Create, update, reorder items; manage assignees and labels |
| **Labels** | CRUD under project | Colored labels for categorization |
| **States** | CRUD under project | Workflow columns (e.g., To Do, In Progress, Done) |
| **Activity** | `GET` activity feed, `POST/PATCH/DELETE` comments | Timeline of all item changes and threaded comments |
| **Search** | `GET /search` | Full-text search across work items with ranking |
| **Custom Fields** | CRUD definitions + values | Define fields per project, set values per item |
| **Attachments** | `POST` upload, `GET` list/download, `DELETE` | File attachments on work items (10 MB max) |
| **Invites** | Create, list, revoke, accept | Token-based guest invitation links |
| **Notifications** | List, unread count, mark read | In-app notification feed |
| **Webhooks** | CRUD configs | Outgoing webhook configuration per workspace |
| **Health** | `GET /health` | Health check (no auth required) |

See [docs/api.md](docs/api.md) for the full API reference covering all 63 endpoints.

## Deployment

Push to `main` to trigger the deploy workflow. The GitHub Action runs a blue-green deploy via SSH.

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `SERVER_HOST` | Server IP address |
| `SERVER_USER` | SSH user (typically `deploy`) |
| `SERVER_SSH_KEY` | SSH private key for deployment |
| `APP_DOMAIN` | Application domain (e.g., `wit.anulectra.com`) |
| `PREVIEW_DOMAIN` | Base domain for PR preview environments |

Database and S3 credentials are auto-generated on the server by the platform bootstrap script.

For full deployment and self-hosting instructions, see the [Towlion platform docs](https://github.com/towlion/platform).

## License

[MIT](LICENSE)
