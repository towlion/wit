from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_project_role, get_workspace_member
from app.models import Label, Project, User, Workspace
from app.schemas import LabelCreate, LabelResponse, LabelUpdate

router = APIRouter(tags=["labels"])


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
    "/workspaces/{ws_slug}/projects/{project_slug}/labels",
    response_model=list[LabelResponse],
)
def list_labels(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all labels in a project."""
    project = _resolve_project(ws_slug, project_slug, user, db)
    return db.query(Label).filter_by(project_id=project.id).all()


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/labels",
    response_model=LabelResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_label(
    ws_slug: str,
    project_slug: str,
    body: LabelCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a label.

    - **409**: Label name already exists in this project
    """
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    if db.query(Label).filter_by(project_id=project.id, name=body.name).first():
        raise HTTPException(status_code=409, detail="Label name already exists")
    label = Label(project_id=project.id, name=body.name, color=body.color)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/labels/{label_id}",
    response_model=LabelResponse,
)
def update_label(
    ws_slug: str,
    project_slug: str,
    label_id: int,
    body: LabelUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a label's name or color."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    label = db.query(Label).filter_by(id=label_id, project_id=project.id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    if body.name is not None:
        label.name = body.name
    if body.color is not None:
        label.color = body.color
    db.commit()
    db.refresh(label)
    return label


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/labels/{label_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_label(
    ws_slug: str,
    project_slug: str,
    label_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a label."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    label = db.query(Label).filter_by(id=label_id, project_id=project.id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    db.delete(label)
    db.commit()
