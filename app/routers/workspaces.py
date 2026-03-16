from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import User, Workspace, WorkspaceMember
from app.schemas import (
    AddMemberRequest,
    MemberResponse,
    UpdateMemberRequest,
    WorkspaceCreate,
    WorkspaceListItem,
    WorkspaceResponse,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _workspace_response(ws: Workspace, db: Session) -> WorkspaceResponse:
    members = (
        db.query(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == ws.id)
        .all()
    )
    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        created_at=ws.created_at,
        members=[
            MemberResponse(user_id=u.id, email=u.email, display_name=u.display_name, role=m.role)
            for m, u in members
        ],
    )


@router.get("", response_model=list[WorkspaceListItem])
def list_workspaces(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Workspace, WorkspaceMember.role)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .filter(WorkspaceMember.user_id == user.id)
        .all()
    )
    return [
        WorkspaceListItem(
            id=ws.id, name=ws.name, slug=ws.slug, created_at=ws.created_at, role=role
        )
        for ws, role in rows
    ]


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    body: WorkspaceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(Workspace).filter_by(slug=body.slug).first():
        raise HTTPException(status_code=409, detail="Slug already taken")
    ws = Workspace(name=body.name, slug=body.slug)
    db.add(ws)
    db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner"))
    db.commit()
    db.refresh(ws)
    return _workspace_response(ws, db)


@router.get("/{slug}", response_model=WorkspaceResponse)
def get_workspace(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    return _workspace_response(ws, db)


@router.patch("/{slug}", response_model=WorkspaceResponse)
def update_workspace(
    slug: str,
    body: WorkspaceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")
    if body.name is not None:
        ws.name = body.name
    db.commit()
    db.refresh(ws)
    return _workspace_response(ws, db)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="owner")
    db.delete(ws)
    db.commit()


# --- Members ---
@router.post("/{slug}/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    slug: str,
    body: AddMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    target = db.query(User).filter_by(email=body.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(WorkspaceMember).filter_by(workspace_id=ws.id, user_id=target.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already a member")

    member = WorkspaceMember(workspace_id=ws.id, user_id=target.id, role=body.role)
    db.add(member)
    db.commit()
    return MemberResponse(
        user_id=target.id, email=target.email, display_name=target.display_name, role=member.role
    )


@router.patch("/{slug}/members/{user_id}", response_model=MemberResponse)
def update_member(
    slug: str,
    user_id: int,
    body: UpdateMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    member = db.query(WorkspaceMember).filter_by(workspace_id=ws.id, user_id=user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = body.role
    db.commit()
    target = db.get(User, user_id)
    return MemberResponse(
        user_id=target.id, email=target.email, display_name=target.display_name, role=member.role
    )


@router.delete("/{slug}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    slug: str,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    member = db.query(WorkspaceMember).filter_by(workspace_id=ws.id, user_id=user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove workspace owner")
    db.delete(member)
    db.commit()
