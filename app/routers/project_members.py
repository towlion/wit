from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_project_role, get_workspace_member
from app.models import Project, ProjectMember, User, Workspace, WorkspaceMember
from app.schemas import ProjectMemberCreate, ProjectMemberResponse, ProjectMemberUpdate

router = APIRouter(tags=["project_members"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ws, project


def _effective_members(db: Session, project, workspace_id: int) -> list[dict]:
    """Build list of all members with effective project roles."""
    ws_members = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id).all()
    pm_map = {}
    for pm in db.query(ProjectMember).filter_by(project_id=project.id).all():
        pm_map[pm.user_id] = pm.role

    result = []
    for wm in ws_members:
        user = db.get(User, wm.user_id)
        if not user:
            continue
        if wm.role in ("owner", "admin"):
            role = "admin"
        elif wm.user_id in pm_map:
            role = pm_map[wm.user_id]
        elif wm.role == "guest":
            continue  # Guests without explicit project access are excluded
        else:
            role = "editor"
        result.append({
            "user_id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "role": role,
        })
    return result


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/project-members",
    response_model=list[ProjectMemberResponse],
)
def list_project_members(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws, project = _resolve_project(ws_slug, project_slug, user, db)
    return _effective_members(db, project, ws.id)


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/project-members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_project_member(
    ws_slug: str,
    project_slug: str,
    body: ProjectMemberCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws, project = _resolve_project(ws_slug, project_slug, user, db)
    get_project_role(project.id, user.id, db, ws.id, min_role="admin")

    target_user = db.query(User).filter_by(email=body.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(ProjectMember).filter_by(project_id=project.id, user_id=target_user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already a project member")

    pm = ProjectMember(project_id=project.id, user_id=target_user.id, role=body.role)
    db.add(pm)
    db.commit()

    return {
        "user_id": target_user.id,
        "email": target_user.email,
        "display_name": target_user.display_name,
        "role": pm.role,
    }


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/project-members/{target_user_id}",
    response_model=ProjectMemberResponse,
)
def update_project_member(
    ws_slug: str,
    project_slug: str,
    target_user_id: int,
    body: ProjectMemberUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws, project = _resolve_project(ws_slug, project_slug, user, db)
    get_project_role(project.id, user.id, db, ws.id, min_role="admin")

    pm = db.query(ProjectMember).filter_by(project_id=project.id, user_id=target_user_id).first()
    if not pm:
        # Create record if it doesn't exist
        target_user = db.get(User, target_user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        pm = ProjectMember(project_id=project.id, user_id=target_user_id, role=body.role)
        db.add(pm)
    else:
        pm.role = body.role
    db.commit()

    target_user = db.get(User, target_user_id)
    return {
        "user_id": target_user.id,
        "email": target_user.email,
        "display_name": target_user.display_name,
        "role": pm.role,
    }


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/project-members/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_project_member(
    ws_slug: str,
    project_slug: str,
    target_user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws, project = _resolve_project(ws_slug, project_slug, user, db)
    get_project_role(project.id, user.id, db, ws.id, min_role="admin")

    pm = db.query(ProjectMember).filter_by(project_id=project.id, user_id=target_user_id).first()
    if not pm:
        raise HTTPException(status_code=404, detail="Not a project member")
    db.delete(pm)
    db.commit()
