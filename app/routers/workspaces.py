from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import (
    ActivityEvent,
    Attachment,
    Label,
    Project,
    User,
    WorkItem,
    WorkItemAssignee,
    WorkItemLabel,
    Workspace,
    WorkspaceMember,
)
from app.schemas import (
    ActivityEventResponse,
    AddMemberRequest,
    BulkArchiveRequest,
    BulkLabelsRequest,
    BulkOperationResponse,
    BulkReassignRequest,
    MemberResponse,
    UpdateMemberRequest,
    UserResponse,
    WorkspaceCreate,
    WorkspaceListItem,
    WorkspaceResponse,
    WorkspaceStatsResponse,
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


# --- Workspace Audit Log ---
@router.get("/{slug}/audit", response_model=list[ActivityEventResponse])
def workspace_audit_log(
    slug: str,
    event_type: str = "",
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    q = (
        db.query(ActivityEvent)
        .join(WorkItem, ActivityEvent.work_item_id == WorkItem.id)
        .join(Project, WorkItem.project_id == Project.id)
        .filter(Project.workspace_id == ws.id)
    )
    if event_type:
        q = q.filter(ActivityEvent.event_type == event_type)
    events = q.order_by(ActivityEvent.created_at.desc()).offset(offset).limit(limit).all()
    result = []
    for ev in events:
        ev_user = db.get(User, ev.user_id) if ev.user_id else None
        user_resp = (
            UserResponse(
                id=ev_user.id,
                email=ev_user.email,
                display_name=ev_user.display_name,
                is_superuser=ev_user.is_superuser,
                created_at=ev_user.created_at,
            )
            if ev_user
            else None
        )
        result.append(
            ActivityEventResponse(
                id=ev.id,
                work_item_id=ev.work_item_id,
                user_id=ev.user_id,
                event_type=ev.event_type,
                body=ev.body,
                old_value=ev.old_value,
                new_value=ev.new_value,
                created_at=ev.created_at,
                user=user_resp,
            )
        )
    return result


# --- Workspace Stats ---
@router.get("/{slug}/stats", response_model=WorkspaceStatsResponse)
def workspace_stats(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    project_ids = [p.id for p in db.query(Project.id).filter(Project.workspace_id == ws.id).all()]

    items_total = (
        db.query(func.count(WorkItem.id))
        .filter(WorkItem.project_id.in_(project_ids))
        .scalar()
        or 0
    ) if project_ids else 0

    items_last_7d = (
        db.query(func.count(WorkItem.id))
        .filter(WorkItem.project_id.in_(project_ids), WorkItem.created_at >= week_ago)
        .scalar()
        or 0
    ) if project_ids else 0

    active_members = (
        db.query(func.count(WorkspaceMember.id))
        .filter(WorkspaceMember.workspace_id == ws.id)
        .scalar()
        or 0
    )

    attachment_count = (
        db.query(func.count(Attachment.id))
        .join(WorkItem, Attachment.work_item_id == WorkItem.id)
        .filter(WorkItem.project_id.in_(project_ids))
        .scalar()
        or 0
    ) if project_ids else 0

    storage_bytes = (
        db.query(func.coalesce(func.sum(Attachment.size_bytes), 0))
        .join(WorkItem, Attachment.work_item_id == WorkItem.id)
        .filter(WorkItem.project_id.in_(project_ids))
        .scalar()
        or 0
    ) if project_ids else 0

    return WorkspaceStatsResponse(
        items_total=items_total,
        items_last_7d=items_last_7d,
        active_members=active_members,
        attachment_count=attachment_count,
        storage_bytes=storage_bytes,
    )


# --- Bulk Operations ---
def _get_workspace_item_ids(db: Session, ws_id: int, item_ids: list[int]) -> list[int]:
    """Validate and return item IDs that belong to the workspace."""
    valid = (
        db.query(WorkItem.id)
        .join(Project, WorkItem.project_id == Project.id)
        .filter(Project.workspace_id == ws_id, WorkItem.id.in_(item_ids))
        .all()
    )
    return [r[0] for r in valid]


@router.post("/{slug}/bulk/archive", response_model=BulkOperationResponse)
def bulk_archive(
    slug: str,
    body: BulkArchiveRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    valid_ids = _get_workspace_item_ids(db, ws.id, body.item_ids)
    if not valid_ids:
        return BulkOperationResponse(affected=0)

    affected = (
        db.query(WorkItem)
        .filter(WorkItem.id.in_(valid_ids))
        .update({WorkItem.archived: True}, synchronize_session="fetch")
    )
    events = [
        ActivityEvent(
            work_item_id=item_id,
            user_id=user.id,
            event_type="archived",
            new_value="true",
        )
        for item_id in valid_ids
    ]
    db.add_all(events)
    db.commit()
    return BulkOperationResponse(affected=affected)


@router.post("/{slug}/bulk/reassign", response_model=BulkOperationResponse)
def bulk_reassign(
    slug: str,
    body: BulkReassignRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    assignee_member = (
        db.query(WorkspaceMember)
        .filter_by(workspace_id=ws.id, user_id=body.assignee_id)
        .first()
    )
    if not assignee_member:
        raise HTTPException(status_code=400, detail="Assignee is not a workspace member")

    valid_ids = _get_workspace_item_ids(db, ws.id, body.item_ids)
    if not valid_ids:
        return BulkOperationResponse(affected=0)

    assignee = db.get(User, body.assignee_id)
    affected = 0
    for item_id in valid_ids:
        existing = (
            db.query(WorkItemAssignee)
            .filter_by(work_item_id=item_id, user_id=body.assignee_id)
            .first()
        )
        if not existing:
            db.add(WorkItemAssignee(work_item_id=item_id, user_id=body.assignee_id))
            db.add(
                ActivityEvent(
                    work_item_id=item_id,
                    user_id=user.id,
                    event_type="assignee_added",
                    new_value=assignee.display_name if assignee else str(body.assignee_id),
                )
            )
            affected += 1
    db.commit()
    return BulkOperationResponse(affected=affected)


@router.post("/{slug}/bulk/labels", response_model=BulkOperationResponse)
def bulk_labels(
    slug: str,
    body: BulkLabelsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    if body.action not in ("add", "remove"):
        raise HTTPException(status_code=400, detail="action must be 'add' or 'remove'")

    label = db.get(Label, body.label_id)
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    valid_ids = _get_workspace_item_ids(db, ws.id, body.item_ids)
    if not valid_ids:
        return BulkOperationResponse(affected=0)

    affected = 0
    for item_id in valid_ids:
        existing = (
            db.query(WorkItemLabel)
            .filter_by(work_item_id=item_id, label_id=body.label_id)
            .first()
        )
        if body.action == "add" and not existing:
            db.add(WorkItemLabel(work_item_id=item_id, label_id=body.label_id))
            db.add(
                ActivityEvent(
                    work_item_id=item_id,
                    user_id=user.id,
                    event_type="label_added",
                    new_value=label.name,
                )
            )
            affected += 1
        elif body.action == "remove" and existing:
            db.delete(existing)
            db.add(
                ActivityEvent(
                    work_item_id=item_id,
                    user_id=user.id,
                    event_type="label_removed",
                    old_value=label.name,
                )
            )
            affected += 1
    db.commit()
    return BulkOperationResponse(affected=affected)
