from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ItemWatcher, User, WorkItem
from app.schemas import WatchResponse

router = APIRouter(tags=["watchers"])

PREFIX = "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/watch"


def _resolve_item(ws_slug: str, project_slug: str, item_number: int, user: User, db: Session) -> WorkItem:
    from app.routers.activity import _resolve_item as resolve
    return resolve(ws_slug, project_slug, item_number, user, db)


def _watch_response(db: Session, item_id: int, user_id: int) -> WatchResponse:
    watching = db.query(ItemWatcher).filter_by(work_item_id=item_id, user_id=user_id).first() is not None
    count = db.query(ItemWatcher).filter_by(work_item_id=item_id).count()
    return WatchResponse(watching=watching, watcher_count=count)


@router.get(PREFIX, response_model=WatchResponse)
def get_watch_status(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if the current user is watching a work item."""
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    return _watch_response(db, item.id, user.id)


@router.post(PREFIX, response_model=WatchResponse, status_code=status.HTTP_200_OK)
def watch_item(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Watch a work item to receive notifications on changes."""
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    existing = db.query(ItemWatcher).filter_by(work_item_id=item.id, user_id=user.id).first()
    if not existing:
        db.add(ItemWatcher(work_item_id=item.id, user_id=user.id))
        db.commit()
    return _watch_response(db, item.id, user.id)


@router.delete(PREFIX, response_model=WatchResponse)
def unwatch_item(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stop watching a work item."""
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    existing = db.query(ItemWatcher).filter_by(work_item_id=item.id, user_id=user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return _watch_response(db, item.id, user.id)
