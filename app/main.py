from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, labels, projects, states, work_items, workspaces

app = FastAPI(title="WIT - Work Item Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(work_items.router, prefix="/api")
app.include_router(labels.router, prefix="/api")
app.include_router(states.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
