import logging
import os
import sys
import time

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pythonjsonlogger import jsonlogger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.routers import (
    activity, admin, api_tokens, attachments, auth, custom_fields, importexport, insights,
    invites, labels, members, notifications, profile, project_members, projects, recurrences,
    saved_views, search, sprints, states, templates, watchers, webhooks, work_items, workspaces,
)

# Configure structured JSON logging
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(
    jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(message)s %(name)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"},
    )
)
logging.root.handlers = [handler]
logging.root.setLevel(logging.INFO)

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app = FastAPI(
    title="WIT - Work Item Tracker",
    version="1.0.0",
    description="Work Item Tracker API. Authenticate via `Authorization: Bearer <token>`.",
    openapi_tags=[
        {"name": "auth", "description": "Registration, login, and token management."},
        {"name": "profile", "description": "User profile and password management."},
        {"name": "workspaces", "description": "Workspace CRUD, members, bulk ops, cross-project views."},
        {"name": "projects", "description": "Project CRUD and board settings."},
        {"name": "work_items", "description": "Work item CRUD, assignees, labels, dependencies, subtasks."},
        {"name": "labels", "description": "Project-scoped label management."},
        {"name": "states", "description": "Workflow state management."},
        {"name": "activity", "description": "Activity feed and comments."},
        {"name": "search", "description": "Full-text search via PostgreSQL tsvector."},
        {"name": "custom_fields", "description": "Custom field definitions and values."},
        {"name": "attachments", "description": "File uploads and downloads (max 10 MB)."},
        {"name": "invites", "description": "Workspace invitation links."},
        {"name": "notifications", "description": "Notification feed and read management."},
        {"name": "webhooks", "description": "Webhook configuration for event delivery."},
        {"name": "api-tokens", "description": "API token creation and revocation."},
        {"name": "templates", "description": "Item templates and automation rules."},
        {"name": "insights", "description": "Analytics, burndown, cycle time, CSV export."},
        {"name": "admin", "description": "System administration (superuser only)."},
        {"name": "watchers", "description": "Watch/unwatch items for notifications."},
        {"name": "members", "description": "Search workspace members."},
        {"name": "saved_views", "description": "Saved filter views."},
    ],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else None,
        },
    )
    return response


app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(work_items.router, prefix="/api")
app.include_router(labels.router, prefix="/api")
app.include_router(states.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(custom_fields.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")
app.include_router(invites.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(api_tokens.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(watchers.router, prefix="/api")
app.include_router(members.router, prefix="/api")
app.include_router(saved_views.router, prefix="/api")
app.include_router(recurrences.router, prefix="/api")
app.include_router(sprints.router, prefix="/api")
app.include_router(project_members.router, prefix="/api")
app.include_router(importexport.router, prefix="/api")


@app.get("/health")
@limiter.exempt
def health(request: Request):
    """Health check.

    Returns `{"status": "ok"}` when the service is running.
    """
    return {"status": "ok"}


# --- WebSocket ---
from app.websocket import manager  # noqa: E402
from app.auth import decode_token  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import User, Project, Workspace, WorkspaceMember  # noqa: E402


@app.websocket("/ws/board/{project_id}")
async def board_websocket(websocket: WebSocket, project_id: int):
    # Authenticate via query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user or not user.is_active:
            await websocket.close(code=4001)
            return

        project = db.get(Project, project_id)
        if not project:
            await websocket.close(code=4004)
            return

        member = (
            db.query(WorkspaceMember)
            .filter_by(workspace_id=project.workspace_id, user_id=user.id)
            .first()
        )
        if not member:
            await websocket.close(code=4003)
            return

        user_info = {"user_id": user.id, "display_name": user.display_name}
    finally:
        db.close()

    await manager.connect(project_id, websocket, user_info)
    try:
        while True:
            data = await websocket.receive_text()
            if len(data) > 4096:
                continue
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(project_id, websocket)
        await manager.broadcast_presence_after_disconnect(project_id)
