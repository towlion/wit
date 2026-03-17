from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_project_role, get_workspace_member
from app.models import Project, User, Workspace, WorkflowState
from app.schemas import StateCreate, StateResponse, StateUpdate

router = APIRouter(tags=["states"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session, min_role: str = "viewer"):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if min_role != "viewer":
        get_project_role(project.id, user.id, db, ws.id, min_role=min_role)
    return project


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/states",
    response_model=list[StateResponse],
)
def list_states(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List workflow states for a project, ordered by position."""
    project = _resolve_project(ws_slug, project_slug, user, db)
    return (
        db.query(WorkflowState)
        .filter_by(project_id=project.id)
        .order_by(WorkflowState.position)
        .all()
    )


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/states",
    response_model=StateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_state(
    ws_slug: str,
    project_slug: str,
    body: StateCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a workflow state."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    state = WorkflowState(
        project_id=project.id,
        name=body.name,
        category=body.category,
        position=body.position,
        color=body.color,
    )
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/states/{state_id}",
    response_model=StateResponse,
)
def update_state(
    ws_slug: str,
    project_slug: str,
    state_id: int,
    body: StateUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a workflow state."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    state = db.query(WorkflowState).filter_by(id=state_id, project_id=project.id).first()
    if not state:
        raise HTTPException(status_code=404, detail="State not found")
    for field in ("name", "category", "position", "color"):
        val = getattr(body, field, None)
        if val is not None:
            setattr(state, field, val)
    db.commit()
    db.refresh(state)
    return state


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/states/{state_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_state(
    ws_slug: str,
    project_slug: str,
    state_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a workflow state."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    state = db.query(WorkflowState).filter_by(id=state_id, project_id=project.id).first()
    if not state:
        raise HTTPException(status_code=404, detail="State not found")
    db.delete(state)
    db.commit()
