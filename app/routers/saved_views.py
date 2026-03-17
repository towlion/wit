from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import Project, SavedView, User, Workspace
from app.schemas import SavedViewCreate, SavedViewResponse

router = APIRouter(tags=["saved_views"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session) -> Project:
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/views",
    response_model=list[SavedViewResponse],
)
def list_views(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's saved filter views for a project."""
    project = _resolve_project(ws_slug, project_slug, user, db)
    return (
        db.query(SavedView)
        .filter_by(project_id=project.id, user_id=user.id)
        .order_by(SavedView.name)
        .all()
    )


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/views",
    response_model=SavedViewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_view(
    ws_slug: str,
    project_slug: str,
    body: SavedViewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a filter view.

    - **409**: View name already exists
    """
    project = _resolve_project(ws_slug, project_slug, user, db)
    existing = (
        db.query(SavedView)
        .filter_by(project_id=project.id, user_id=user.id, name=body.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="View name already exists")
    view = SavedView(
        project_id=project.id,
        user_id=user.id,
        name=body.name,
        filters=body.filters,
    )
    db.add(view)
    db.commit()
    db.refresh(view)
    return view


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/views/{view_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_view(
    ws_slug: str,
    project_slug: str,
    view_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved filter view."""
    project = _resolve_project(ws_slug, project_slug, user, db)
    view = (
        db.query(SavedView)
        .filter_by(id=view_id, project_id=project.id, user_id=user.id)
        .first()
    )
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    db.delete(view)
    db.commit()
