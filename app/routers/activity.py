from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.activity import record_activity
from app.database import get_db
from app.deps import get_current_user
from app.mentions import extract_mentions, resolve_mentioned_users
from app.models import ActivityEvent, ItemWatcher, Notification, Project, User, Workspace, WorkItem
from app.schemas import ActivityEventResponse, CommentCreate, CommentUpdate

router = APIRouter(tags=["activity"])


def _resolve_item(ws_slug: str, project_slug: str, item_number: int, user: User, db: Session, min_role: str = "viewer") -> WorkItem:
    from app.routers.work_items import _resolve_project

    project = _resolve_project(ws_slug, project_slug, user, db, min_role=min_role)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/activity",
    response_model=list[ActivityEventResponse],
)
def list_activity(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List activity events for a work item (newest first)."""
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    return (
        db.query(ActivityEvent)
        .filter_by(work_item_id=item.id)
        .order_by(ActivityEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/comments",
    response_model=ActivityEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a comment to a work item.

    Auto-watches the commenter and processes @mentions.
    """
    item = _resolve_item(ws_slug, project_slug, item_number, user, db, min_role="editor")
    event = record_activity(db, item.id, user.id, "comment", body=body.body)

    # Auto-watch on comment
    existing_watch = db.query(ItemWatcher).filter_by(work_item_id=item.id, user_id=user.id).first()
    if not existing_watch:
        db.add(ItemWatcher(work_item_id=item.id, user_id=user.id))

    # Process @mentions
    mentioned_names = extract_mentions(body.body)
    if mentioned_names:
        from app.models import WorkItemAssignee
        from app.notifications import notify_item_watchers  # noqa: F811

        # Build the set of users who already get a "comment" notification
        already_notified = set()
        already_notified.add(item.created_by_id)
        for a in db.query(WorkItemAssignee).filter_by(work_item_id=item.id).all():
            already_notified.add(a.user_id)
        for w in db.query(ItemWatcher).filter_by(work_item_id=item.id).all():
            already_notified.add(w.user_id)
        already_notified.discard(user.id)

        workspace = db.query(Workspace).filter_by(slug=ws_slug).first()
        mentioned_users = resolve_mentioned_users(db, mentioned_names, workspace.id)
        title = f"#{item.item_number} {item.title}"
        for mu in mentioned_users:
            if mu.id == user.id:
                continue
            # Auto-watch mentioned user
            if not db.query(ItemWatcher).filter_by(work_item_id=item.id, user_id=mu.id).first():
                db.add(ItemWatcher(work_item_id=item.id, user_id=mu.id))
            # Only create mention notification if not already getting a comment notification
            if mu.id not in already_notified:
                db.add(Notification(
                    user_id=mu.id,
                    work_item_id=item.id,
                    event_type="mention",
                    title=title,
                    body=f"{user.display_name} mentioned you: {body.body[:200]}",
                ))

    db.commit()
    db.refresh(event)
    return event


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/comments/{comment_id}",
    response_model=ActivityEventResponse,
)
def update_comment(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    comment_id: int,
    body: CommentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit a comment. Only the author can edit.

    - **403**: Can only edit own comments
    """
    item = _resolve_item(ws_slug, project_slug, item_number, user, db, min_role="editor")
    event = db.query(ActivityEvent).filter_by(id=comment_id, work_item_id=item.id, event_type="comment").first()
    if not event:
        raise HTTPException(status_code=404, detail="Comment not found")
    if event.user_id != user.id:
        raise HTTPException(status_code=403, detail="Can only edit own comments")
    event.body = body.body
    db.commit()
    db.refresh(event)
    return event


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    comment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a comment. Only the author can delete.

    - **403**: Can only delete own comments
    """
    item = _resolve_item(ws_slug, project_slug, item_number, user, db, min_role="editor")
    event = db.query(ActivityEvent).filter_by(id=comment_id, work_item_id=item.id, event_type="comment").first()
    if not event:
        raise HTTPException(status_code=404, detail="Comment not found")
    if event.user_id != user.id:
        raise HTTPException(status_code=403, detail="Can only delete own comments")
    db.delete(event)
    db.commit()
