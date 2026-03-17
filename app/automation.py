import logging

from sqlalchemy.orm import Session

from app.models import (
    AutomationRule,
    Label,
    User,
    WorkItem,
    WorkItemAssignee,
    WorkItemLabel,
)

logger = logging.getLogger(__name__)


def run_status_automations(
    db: Session,
    item: WorkItem,
    new_state_id: int,
    actor_user_id: int,
) -> None:
    """Execute automation rules triggered by entering a status."""
    rules = (
        db.query(AutomationRule)
        .filter_by(
            project_id=item.project_id,
            trigger="status_enter",
            trigger_state_id=new_state_id,
            enabled=True,
        )
        .all()
    )

    for rule in rules:
        try:
            _execute_action(db, item, rule, actor_user_id)
        except Exception:
            logger.exception("Automation rule %d failed for item %d", rule.id, item.id)


def _execute_action(
    db: Session,
    item: WorkItem,
    rule: AutomationRule,
    actor_user_id: int,
) -> None:
    config = rule.action_config

    if rule.action == "assign_user":
        user_id = config.get("user_id")
        if user_id and not db.query(WorkItemAssignee).filter_by(work_item_id=item.id, user_id=user_id).first():
            user = db.get(User, user_id)
            if user:
                db.add(WorkItemAssignee(work_item_id=item.id, user_id=user_id))
                from app.activity import record_activity
                record_activity(
                    db, item.id, actor_user_id, "assignee_added",
                    new_value=user.display_name,
                )

    elif rule.action == "add_label":
        label_id = config.get("label_id")
        if label_id and not db.query(WorkItemLabel).filter_by(work_item_id=item.id, label_id=label_id).first():
            label = db.get(Label, label_id)
            if label:
                db.add(WorkItemLabel(work_item_id=item.id, label_id=label_id))
                from app.activity import record_activity
                record_activity(
                    db, item.id, actor_user_id, "label_added",
                    new_value=label.name,
                )

    elif rule.action == "set_priority":
        priority = config.get("priority")
        if priority and priority != item.priority:
            from app.activity import record_activity
            record_activity(
                db, item.id, actor_user_id, "priority_change",
                old_value=item.priority, new_value=priority,
            )
            item.priority = priority
