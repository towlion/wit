from sqlalchemy.orm import Session

from app.models import ActivityEvent, WorkItem
from app.notifications import fire_webhooks, notify_item_watchers


def record_activity(
    db: Session,
    work_item_id: int,
    user_id: int | None,
    event_type: str,
    body: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
) -> ActivityEvent:
    event = ActivityEvent(
        work_item_id=work_item_id,
        user_id=user_id,
        event_type=event_type,
        body=body,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(event)

    # In-app notifications + webhooks
    work_item = db.get(WorkItem, work_item_id)
    if work_item and user_id:
        title = f"#{work_item.item_number} {work_item.title}"
        detail = body or ""
        if event_type == "status_change":
            detail = f"Status changed: {old_value} -> {new_value}"
        elif event_type == "priority_change":
            detail = f"Priority changed: {old_value} -> {new_value}"
        elif event_type == "assignee_added":
            detail = f"Assigned: {new_value}"
        elif event_type == "assignee_removed":
            detail = f"Unassigned: {old_value}"
        elif event_type == "comment":
            detail = body or ""

        notify_item_watchers(db, work_item, user_id, event_type, title, detail)

        fire_webhooks(
            db,
            work_item.project.workspace_id,
            event_type,
            {
                "work_item_id": work_item_id,
                "item_number": work_item.item_number,
                "title": work_item.title,
                "detail": detail,
            },
        )

    return event
