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
- API tokens with configurable expiry
- Admin panel (system dashboard, user/workspace management, audit log)
- Project analytics (status/priority charts, burndown, cycle time, CSV export)
- Board customization (swimlanes, WIP limits, card display settings)
- Item templates and automation rules
- Cross-project board and portfolio views
- Real-time board updates via WebSocket
- Dependency tracking and DAG visualization
- Item watching, @mentions, markdown toolbar
- Advanced filtering with saved views
- Dark/light/system theme
- Subtasks and checklists
- Email notifications (opt-in, immediate/daily digest)
- In-app help page

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
  alembic/              # Database migrations (0001-0018)
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
| `SMTP_HOST` | No | SMTP server hostname |
| `SMTP_PORT` | No | SMTP server port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASSWORD` | No | SMTP password |
| `SMTP_FROM` | No | Sender email address |

## API Overview

All endpoints are under `/api`. Authentication via JWT Bearer token unless noted.

| Group | Endpoints | Description |
|---|---|---|
| **Auth** | `POST /auth/register`, `/auth/login`, `GET /auth/me` | Registration, login, current user |
| **Workspaces** | CRUD + member management | Create, update, delete workspaces; add/remove members |
| **Projects** | CRUD under workspace | Projects with templates and workflow states |
| **Work Items** | CRUD + assignees + labels + dependencies + subtasks | Create, update, reorder items; manage relationships |
| **Labels** | CRUD under project | Colored labels for categorization |
| **States** | CRUD under project | Workflow columns (e.g., To Do, In Progress, Done) |
| **Activity** | `GET` activity feed, `POST/PATCH/DELETE` comments | Timeline of all item changes and threaded comments |
| **Search** | `GET /search` | Full-text search across work items with ranking |
| **Custom Fields** | CRUD definitions + values | Define fields per project, set values per item |
| **Attachments** | `POST` upload, `GET` list/download, `DELETE` | File attachments on work items (10 MB max) |
| **Invites** | Create, list, revoke, accept | Token-based guest invitation links |
| **Notifications** | List, unread count, mark read | In-app notification feed |
| **Webhooks** | CRUD configs | Outgoing webhook configuration per workspace |
| **API Tokens** | Create, list, revoke | Personal API tokens with configurable expiry |
| **Admin** | Users, workspaces, audit log, stats | System administration (superuser only) |
| **Templates** | CRUD under project | Item templates with default fields |
| **Automations** | CRUD under project | Rules triggered on status change |
| **Dependencies** | Add, remove, list | Block/blocked-by relationships between items |
| **Subtasks** | CRUD under item | Checklists with completion tracking |
| **Watchers** | Watch, unwatch, status | Per-item watch subscriptions |
| **Reports** | Project analytics, workspace insights | Status/priority distribution, burndown, cycle time |
| **Saved Views** | CRUD under project | Persistent filter configurations |
| **Profile** | Get, update | User profile and preferences |
| **Bulk Operations** | Archive, reassign, label | Batch actions on selected items |
| **WebSocket** | `/ws/board/{project_id}` | Real-time board updates and presence |
| **Health** | `GET /health` | Health check (no auth required) |

See [docs/api.md](docs/api.md) for the full API reference covering all 106 endpoints.

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
