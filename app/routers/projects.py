from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import Project, User, Workspace, WorkflowState
from app.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(tags=["projects"])

TEMPLATE_STATES = {
    "software": [
        ("Open", "todo", 0, "#6b7280"),
        ("In Progress", "in_progress", 1, "#3b82f6"),
        ("In Review", "in_progress", 2, "#8b5cf6"),
        ("Done", "done", 3, "#22c55e"),
    ],
    "home": [
        ("To Do", "todo", 0, "#6b7280"),
        ("Doing", "in_progress", 1, "#f59e0b"),
        ("Done", "done", 2, "#22c55e"),
    ],
    "event": [
        ("Idea", "todo", 0, "#6b7280"),
        ("Getting Quotes", "in_progress", 1, "#3b82f6"),
        ("Confirmed", "done", 2, "#22c55e"),
    ],
}


def _get_workspace(slug: str, user: User, db: Session, min_role: str = "guest") -> Workspace:
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role=min_role)
    return ws


@router.get("/workspaces/{ws_slug}/projects", response_model=list[ProjectResponse])
def list_projects(
    ws_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = _get_workspace(ws_slug, user, db)
    return db.query(Project).filter_by(workspace_id=ws.id).all()


@router.post(
    "/workspaces/{ws_slug}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    ws_slug: str,
    body: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = _get_workspace(ws_slug, user, db, min_role="member")

    if db.query(Project).filter_by(workspace_id=ws.id, slug=body.slug).first():
        raise HTTPException(status_code=409, detail="Project slug already exists")

    project = Project(
        workspace_id=ws.id,
        name=body.name,
        slug=body.slug,
        description=body.description,
        template=body.template,
    )
    db.add(project)
    db.flush()

    # Seed workflow states from template
    for name, category, position, color in TEMPLATE_STATES.get(body.template, TEMPLATE_STATES["software"]):
        db.add(WorkflowState(
            project_id=project.id, name=name, category=category, position=position, color=color
        ))

    db.commit()
    db.refresh(project)
    return project


@router.get("/workspaces/{ws_slug}/projects/{project_slug}", response_model=ProjectResponse)
def get_project(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = _get_workspace(ws_slug, user, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/workspaces/{ws_slug}/projects/{project_slug}", response_model=ProjectResponse)
def update_project(
    ws_slug: str,
    project_slug: str,
    body: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = _get_workspace(ws_slug, user, db, min_role="member")
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    if body.board_settings is not None:
        project.board_settings = body.board_settings.model_dump()
    db.commit()
    db.refresh(project)
    return project


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = _get_workspace(ws_slug, user, db, min_role="admin")
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
