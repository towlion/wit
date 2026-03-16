import logging

import httpx
from sqlalchemy.orm import Session

from app.models import Notification, WebhookConfig, WorkItem, WorkItemAssignee

logger = logging.getLogger(__name__)


def notify_item_watchers(
    db: Session,
    work_item: WorkItem,
    actor_id: int,
    event_type: str,
    title: str,
    body: str = "",
):
    # Notify assignees + creator, excluding the actor
    watcher_ids = set()
    watcher_ids.add(work_item.created_by_id)
    assignees = db.query(WorkItemAssignee).filter_by(work_item_id=work_item.id).all()
    for a in assignees:
        watcher_ids.add(a.user_id)
    watcher_ids.discard(actor_id)

    for uid in watcher_ids:
        db.add(Notification(
            user_id=uid,
            work_item_id=work_item.id,
            event_type=event_type,
            title=title,
            body=body,
        ))


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
