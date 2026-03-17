import logging
import threading

import httpx
from sqlalchemy.orm import Session

from app.models import ItemWatcher, Notification, User, WebhookConfig, WorkItem, WorkItemAssignee

logger = logging.getLogger(__name__)


def notify_item_watchers(
    db: Session,
    work_item: WorkItem,
    actor_id: int,
    event_type: str,
    title: str,
    body: str = "",
):
    from app.email_service import send_notification_email, should_send_email

    # Notify assignees + creator + explicit watchers, excluding the actor
    watcher_ids = set()
    watcher_ids.add(work_item.created_by_id)
    assignees = db.query(WorkItemAssignee).filter_by(work_item_id=work_item.id).all()
    for a in assignees:
        watcher_ids.add(a.user_id)
    explicit_watchers = db.query(ItemWatcher).filter_by(work_item_id=work_item.id).all()
    for w in explicit_watchers:
        watcher_ids.add(w.user_id)
    watcher_ids.discard(actor_id)

    for uid in watcher_ids:
        db.add(Notification(
            user_id=uid,
            work_item_id=work_item.id,
            event_type=event_type,
            title=title,
            body=body,
        ))
        if should_send_email(db, uid, work_item.id, event_type):
            user = db.get(User, uid)
            if user:
                user_email = user.email
                user_id = user.id

                def _send(uid=user_id, email=user_email, wi_id=work_item.id, et=event_type, t=title, d=body or title):
                    from app.database import SessionLocal
                    thread_db = SessionLocal()
                    try:
                        thread_user = thread_db.get(User, uid)
                        if thread_user:
                            send_notification_email(thread_db, thread_user, wi_id, et, t, d)
                    finally:
                        thread_db.close()

                threading.Thread(target=_send, daemon=True).start()


def fire_webhooks(
    db: Session,
    workspace_id: int,
    event_type: str,
    payload: dict,
):
    configs = (
        db.query(WebhookConfig)
        .filter_by(workspace_id=workspace_id, active=True)
        .all()
    )
    for config in configs:
        # Only fire if event type matches (or all events if event_types is null/empty)
        if config.event_types:
            types = config.event_types.get("types", [])
            if types and event_type not in types:
                continue

        try:
            httpx.post(
                config.url,
                json={"event_type": event_type, **payload},
                timeout=5.0,
            )
        except Exception as e:
            logger.warning("Webhook delivery failed: %s %s", config.url, e)
