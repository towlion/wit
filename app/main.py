import logging
import sys
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pythonjsonlogger import jsonlogger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.routers import (
    activity, api_tokens, attachments, auth, custom_fields, invites, labels,
    notifications, profile, projects, search, states, webhooks, work_items, workspaces,
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
app = FastAPI(title="WIT - Work Item Tracker")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/health")
@limiter.exempt
def health(request: Request):
    return {"status": "ok"}
