import datetime
import logging

from sqlalchemy.orm import Session

from app.models import (
    AutomationLog,
    AutomationRule,
    Label,
    Notification,
    Project,
    User,
    WorkflowState,
    WorkItem,
    WorkItemAssignee,
    WorkItemDependency,
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


def run_label_automations(
    db: Session,
    item: WorkItem,
    label_id: int,
    actor_user_id: int,
) -> None:
    """Execute automation rules triggered by adding a label."""
    rules = (
        db.query(AutomationRule)
        .filter_by(
            project_id=item.project_id,
            trigger="label_added",
            enabled=True,
        )
        .all()
    )

    for rule in rules:
        try:
            config = rule.trigger_config or {}
            if config.get("label_id") and config["label_id"] != label_id:
                continue
            _execute_action(db, item, rule, actor_user_id)
        except Exception:
            logger.exception("Automation rule %d failed for item %d", rule.id, item.id)


def process_due_date_automations(db: Session) -> int:
    """Process due_date_approaching rules. Returns count of items processed."""
    rules = (
        db.query(AutomationRule)
        .filter_by(trigger="due_date_approaching", enabled=True)
        .all()
    )

    processed = 0
    today = datetime.date.today()

    for rule in rules:
        try:
            config = rule.trigger_config or {}
            days_before = config.get("days_before", 1)
            threshold = today + datetime.timedelta(days=days_before)

            items = (
                db.query(WorkItem)
                .outerjoin(
                    AutomationLog,
                    (AutomationLog.rule_id == rule.id)
                    & (AutomationLog.work_item_id == WorkItem.id),
                )
                .filter(
                    WorkItem.project_id == rule.project_id,
                    WorkItem.due_date.isnot(None),
                    WorkItem.due_date <= threshold,
                    WorkItem.due_date >= today,
                    WorkItem.archived == False,
                    AutomationLog.id.is_(None),
                )
                .all()
            )

            for item in items:
                _execute_action(db, item, rule, None)
                db.add(AutomationLog(rule_id=rule.id, work_item_id=item.id))
                processed += 1
        except Exception:
            logger.exception("Due-date automation rule %d failed", rule.id)

    return processed


def _execute_action(
    db: Session,
    item: WorkItem,
    rule: AutomationRule,
    actor_user_id: int | None,
) -> None:
    from app.activity import record_activity

    config = rule.action_config

    if rule.action == "assign_user":
        user_id = config.get("user_id")
        if user_id and not db.query(WorkItemAssignee).filter_by(work_item_id=item.id, user_id=user_id).first():
            user = db.get(User, user_id)
            if user:
                db.add(WorkItemAssignee(work_item_id=item.id, user_id=user_id))
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
                record_activity(
                    db, item.id, actor_user_id, "label_added",
                    new_value=label.name,
                )

    elif rule.action == "set_priority":
        priority = config.get("priority")
        if priority and priority != item.priority:
            record_activity(
                db, item.id, actor_user_id, "priority_change",
                old_value=item.priority, new_value=priority,
            )
            item.priority = priority

    elif rule.action == "move_to_state":
        state_id = config.get("state_id")
        if state_id and state_id != item.status_id:
            old_state = db.get(WorkflowState, item.status_id)
            new_state = db.get(WorkflowState, state_id)
            if new_state:
                record_activity(
                    db, item.id, actor_user_id, "status_change",
                    old_value=old_state.name if old_state else "",
                    new_value=new_state.name,
                )
                item.status_id = state_id

    elif rule.action == "notify_user":
        user_id = config.get("user_id")
        message = config.get("message", "")
        if user_id:
            db.add(Notification(
                user_id=user_id,
                work_item_id=item.id,
                event_type="automation",
                title=f"#{item.item_number} {item.title}",
                body=message,
            ))

    elif rule.action == "create_linked_item":
        title = config.get("title", "Follow-up")
        state_id = config.get("state_id")
        priority = config.get("priority", "medium")

        project = db.get(Project, item.project_id)
        if project:
            if not state_id:
                first_state = (
                    db.query(WorkflowState)
                    .filter_by(project_id=project.id)
                    .order_by(WorkflowState.position)
                    .first()
                )
                state_id = first_state.id if first_state else item.status_id

            project.item_counter += 1
            new_item = WorkItem(
                project_id=project.id,
                item_number=project.item_counter,
                title=title,
                status_id=state_id,
                priority=priority,
                created_by_id=actor_user_id or item.created_by_id,
            )
            db.add(new_item)
            db.flush()

            db.add(WorkItemDependency(
                blocking_item_id=new_item.id,
                blocked_item_id=item.id,
            ))
            record_activity(
                db, new_item.id, actor_user_id, "created",
            )
