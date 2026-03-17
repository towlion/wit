from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_superuser
from app.models import (
    AdminAuditLog,
    Project,
    User,
    WorkItem,
    Workspace,
    WorkspaceMember,
)
from app.schemas import (
    AdminAuditLogResponse,
    AdminDashboardResponse,
    AdminUserResponse,
    AdminUserUpdate,
    AdminWorkspaceResponse,
    MemberResponse,
    UserResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard(
    user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_workspaces = db.query(func.count(Workspace.id)).scalar() or 0
    total_items = db.query(func.count(WorkItem.id)).scalar() or 0
    signups_last_7d = (
        db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0
    )
    return AdminDashboardResponse(
        total_users=total_users,
        active_users=active_users,
        total_workspaces=total_workspaces,
        total_items=total_items,
        signups_last_7d=signups_last_7d,
    )


@router.get("/users", response_model=list[AdminUserResponse])
def admin_list_users(
    search: str = "",
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if search:
        pattern = f"%{search}%"
        q = q.filter((User.email.ilike(pattern)) | (User.display_name.ilike(pattern)))
    users = q.order_by(User.id).offset(offset).limit(limit).all()
    result = []
    for u in users:
        ws_count = (
            db.query(func.count(WorkspaceMember.id))
            .filter(WorkspaceMember.user_id == u.id)
            .scalar()
            or 0
        )
        result.append(
            AdminUserResponse(
                id=u.id,
                email=u.email,
                display_name=u.display_name,
                is_superuser=u.is_superuser,
                is_active=u.is_active,
                created_at=u.created_at,
                workspace_count=ws_count,
            )
        )
    return result


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def admin_update_user(
    user_id: int,
    body: AdminUserUpdate,
    user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user.id and body.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    changes = {}
    if body.is_active is not None and body.is_active != target.is_active:
        changes["is_active"] = {"old": target.is_active, "new": body.is_active}
        target.is_active = body.is_active
    if body.is_superuser is not None and body.is_superuser != target.is_superuser:
        changes["is_superuser"] = {"old": target.is_superuser, "new": body.is_superuser}
        target.is_superuser = body.is_superuser

    if changes:
        action = "user.updated"
        if "is_active" in changes:
            action = "user.deactivated" if not body.is_active else "user.activated"
        elif "is_superuser" in changes:
            action = "user.superuser_granted" if body.is_superuser else "user.superuser_revoked"
        db.add(
            AdminAuditLog(
                actor_id=user.id,
                action=action,
                entity_type="user",
                entity_id=target.id,
                details=changes,
            )
        )
    db.commit()
    db.refresh(target)

    ws_count = (
        db.query(func.count(WorkspaceMember.id))
        .filter(WorkspaceMember.user_id == target.id)
        .scalar()
        or 0
    )
    return AdminUserResponse(
        id=target.id,
        email=target.email,
        display_name=target.display_name,
        is_superuser=target.is_superuser,
        is_active=target.is_active,
        created_at=target.created_at,
        workspace_count=ws_count,
    )


@router.get("/workspaces", response_model=list[AdminWorkspaceResponse])
def admin_list_workspaces(
    search: str = "",
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    q = db.query(Workspace)
    if search:
        pattern = f"%{search}%"
        q = q.filter((Workspace.name.ilike(pattern)) | (Workspace.slug.ilike(pattern)))
    workspaces = q.order_by(Workspace.id).offset(offset).limit(limit).all()
    result = []
    for ws in workspaces:
        member_count = (
            db.query(func.count(WorkspaceMember.id))
            .filter(WorkspaceMember.workspace_id == ws.id)
            .scalar()
            or 0
        )
        project_count = (
            db.query(func.count(Project.id))
            .filter(Project.workspace_id == ws.id)
            .scalar()
            or 0
        )
        item_count = (
            db.query(func.count(WorkItem.id))
            .join(Project, WorkItem.project_id == Project.id)
            .filter(Project.workspace_id == ws.id)
            .scalar()
            or 0
        )
        result.append(
            AdminWorkspaceResponse(
                id=ws.id,
                name=ws.name,
                slug=ws.slug,
                created_at=ws.created_at,
                member_count=member_count,
                project_count=project_count,
                item_count=item_count,
            )
        )
    return result


@router.get("/workspaces/{workspace_id}/members", response_model=list[MemberResponse])
def admin_workspace_members(
    workspace_id: int,
    user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    ws = db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    rows = (
        db.query(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .all()
    )
    return [
        MemberResponse(user_id=u.id, email=u.email, display_name=u.display_name, role=m.role)
        for m, u in rows
    ]


@router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_workspace(
    workspace_id: int,
    user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    ws = db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.add(
        AdminAuditLog(
            actor_id=user.id,
            action="workspace.deleted",
            entity_type="workspace",
            entity_id=ws.id,
            details={"name": ws.name, "slug": ws.slug},
        )
    )
    db.delete(ws)
    db.commit()


@router.get("/audit-log", response_model=list[AdminAuditLogResponse])
def admin_audit_log(
    entity_type: str = "",
    action: str = "",
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    q = db.query(AdminAuditLog)
    if entity_type:
        q = q.filter(AdminAuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AdminAuditLog.action == action)
    logs = q.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit).all()
    result = []
    for log in logs:
        actor = db.get(User, log.actor_id) if log.actor_id else None
        actor_resp = (
            UserResponse(
                id=actor.id,
                email=actor.email,
                display_name=actor.display_name,
                is_superuser=actor.is_superuser,
                created_at=actor.created_at,
            )
            if actor
            else None
        )
        result.append(
            AdminAuditLogResponse(
                id=log.id,
                actor_id=log.actor_id,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                details=log.details,
                created_at=log.created_at,
                actor=actor_resp,
            )
        )
    return result
