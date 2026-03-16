import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import User, Workspace, WorkspaceInvite, WorkspaceMember
from app.schemas import InviteCreate, InvitePublicResponse, InviteResponse

router = APIRouter(tags=["invites"])


@router.post(
    "/workspaces/{ws_slug}/invites",
    response_model=InviteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invite(
    ws_slug: str,
    body: InviteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    expires_at = None
    if body.expires_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=body.expires_hours)

    invite = WorkspaceInvite(
        workspace_id=ws.id,
        token=secrets.token_urlsafe(32),
        role=body.role,
        created_by_id=user.id,
        expires_at=expires_at,
        max_uses=body.max_uses,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


@router.get(
    "/workspaces/{ws_slug}/invites",
    response_model=list[InviteResponse],
)
def list_invites(
    ws_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")
    return db.query(WorkspaceInvite).filter_by(workspace_id=ws.id).order_by(WorkspaceInvite.created_at.desc()).all()


@router.delete(
    "/workspaces/{ws_slug}/invites/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def revoke_invite(
    ws_slug: str,
    invite_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")
    invite = db.query(WorkspaceInvite).filter_by(id=invite_id, workspace_id=ws.id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    db.delete(invite)
    db.commit()


# --- Public invite endpoints (no workspace slug needed) ---

@router.get(
    "/invites/{token}",
    response_model=InvitePublicResponse,
)
def get_invite_info(
    token: str,
    db: Session = Depends(get_db),
):
    invite = db.query(WorkspaceInvite).filter_by(token=token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or expired")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite has expired")
    if invite.max_uses and invite.use_count >= invite.max_uses:
        raise HTTPException(status_code=410, detail="Invite has reached maximum uses")
    ws = db.get(Workspace, invite.workspace_id)
    return {"workspace_name": ws.name if ws else "Unknown", "role": invite.role}


@router.post(
    "/invites/{token}/accept",
    status_code=status.HTTP_201_CREATED,
)
def accept_invite(
    token: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(WorkspaceInvite).filter_by(token=token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite has expired")
    if invite.max_uses and invite.use_count >= invite.max_uses:
        raise HTTPException(status_code=410, detail="Invite has reached maximum uses")

    # Check if already a member
    existing = (
        db.query(WorkspaceMember)
        .filter_by(workspace_id=invite.workspace_id, user_id=user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already a member of this workspace")

    db.add(WorkspaceMember(
        workspace_id=invite.workspace_id,
        user_id=user.id,
        role=invite.role,
    ))
    invite.use_count += 1
    db.commit()
    return {"ok": True}
