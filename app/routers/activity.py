from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.activity import record_activity
from app.database import get_db
from app.deps import get_current_user
from app.models import ActivityEvent, Project, User, Workspace, WorkItem
from app.schemas import ActivityEventResponse, CommentCreate, CommentUpdate

router = APIRouter(tags=["activity"])


def _resolve_item(ws_slug: str, project_slug: str, item_number: int, user: User, db: Session) -> WorkItem:
    from app.routers.work_items import _resolve_project

    project = _resolve_project(ws_slug, project_slug, user, db)
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
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    event = record_activity(db, item.id, user.id, "comment", body=body.body)
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
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
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
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    event = db.query(ActivityEvent).filter_by(id=comment_id, work_item_id=item.id, event_type="comment").first()
    if not event:
        raise HTTPException(status_code=404, detail="Comment not found")
    if event.user_id != user.id:
        raise HTTPException(status_code=403, detail="Can only delete own comments")
    db.delete(event)
    db.commit()
