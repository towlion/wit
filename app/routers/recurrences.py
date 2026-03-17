import asyncio
import datetime
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.activity import record_activity
from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import (
    Label,
    Project,
    RecurrenceRule,
    User,
    Workspace,
    WorkItem,
    WorkItemAssignee,
    WorkItemLabel,
)
from app.schemas import (
    RecurrenceProcessResponse,
    RecurrenceRuleCreate,
    RecurrenceRuleResponse,
    RecurrenceRuleUpdate,
)
from app.websocket import manager as ws_manager

router = APIRouter(tags=["recurrences"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ws, project


def _broadcast(project_id: int, event_type: str, item_number: int):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast(project_id, {"type": event_type, "item_number": item_number}))
    except RuntimeError:
        pass


def _rule_response(rule: RecurrenceRule, db: Session) -> RecurrenceRuleResponse:
    item = db.get(WorkItem, rule.template_item_id)
    return RecurrenceRuleResponse(
        id=rule.id,
        project_id=rule.project_id,
        template_item_id=rule.template_item_id,
        template_item_number=item.item_number if item else 0,
        template_title=item.title if item else "",
        frequency=rule.frequency,
        day_of_week=rule.day_of_week,
        day_of_month=rule.day_of_month,
        next_run_at=rule.next_run_at,
        enabled=rule.enabled,
        created_at=rule.created_at,
    )


def _compute_next_run(current: datetime.date, frequency: str) -> datetime.date:
    if frequency == "daily":
        return current + datetime.timedelta(days=1)
    elif frequency == "weekly":
        return current + datetime.timedelta(days=7)
    elif frequency == "monthly":
        month = current.month + 1
        year = current.year
        if month > 12:
            month = 1
            year += 1
        day = min(current.day, 28)
        return datetime.date(year, month, day)
    return current + datetime.timedelta(days=1)


@router.get("/workspaces/{ws_slug}/projects/{project_slug}/recurrences")
def list_recurrences(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RecurrenceRuleResponse]:
    _, project = _resolve_project(ws_slug, project_slug, user, db)
    rules = db.query(RecurrenceRule).filter_by(project_id=project.id).order_by(RecurrenceRule.id).all()
    return [_rule_response(r, db) for r in rules]


@router.post("/workspaces/{ws_slug}/projects/{project_slug}/recurrences", status_code=201)
def create_recurrence(
    ws_slug: str,
    project_slug: str,
    body: RecurrenceRuleCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecurrenceRuleResponse:
    _, project = _resolve_project(ws_slug, project_slug, user, db)

    template_item = (
        db.query(WorkItem)
        .filter_by(project_id=project.id, item_number=body.template_item_number)
        .first()
    )
    if not template_item:
        raise HTTPException(status_code=404, detail="Template item not found")

    today = datetime.date.today()
    next_run = _compute_next_run(today, body.frequency)

    rule = RecurrenceRule(
        project_id=project.id,
        template_item_id=template_item.id,
        frequency=body.frequency,
        day_of_week=body.day_of_week,
        day_of_month=body.day_of_month,
        next_run_at=next_run,
        enabled=True,
        created_by_id=user.id,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _rule_response(rule, db)


@router.patch("/workspaces/{ws_slug}/projects/{project_slug}/recurrences/{rule_id}")
def update_recurrence(
    ws_slug: str,
    project_slug: str,
    rule_id: int,
    body: RecurrenceRuleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecurrenceRuleResponse:
    _, project = _resolve_project(ws_slug, project_slug, user, db)

    rule = db.query(RecurrenceRule).filter_by(id=rule_id, project_id=project.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Recurrence rule not found")

    if body.frequency is not None:
        rule.frequency = body.frequency
        rule.next_run_at = _compute_next_run(datetime.date.today(), body.frequency)
    if body.day_of_week is not None:
        rule.day_of_week = body.day_of_week
    if body.day_of_month is not None:
        rule.day_of_month = body.day_of_month
    if body.enabled is not None:
        rule.enabled = body.enabled

    db.commit()
    db.refresh(rule)
    return _rule_response(rule, db)


@router.delete("/workspaces/{ws_slug}/projects/{project_slug}/recurrences/{rule_id}", status_code=204)
def delete_recurrence(
    ws_slug: str,
    project_slug: str,
    rule_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, project = _resolve_project(ws_slug, project_slug, user, db)

    rule = db.query(RecurrenceRule).filter_by(id=rule_id, project_id=project.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Recurrence rule not found")

    db.delete(rule)
    db.commit()


@router.post("/internal/process-recurrences")
def process_recurrences(
    x_internal_secret: str | None = Header(None, alias="X-Internal-Secret"),
    db: Session = Depends(get_db),
) -> RecurrenceProcessResponse:
    expected = os.getenv("INTERNAL_SECRET", "")
    if not expected or x_internal_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

    today = datetime.date.today()
    rules = (
        db.query(RecurrenceRule)
        .filter(RecurrenceRule.enabled == True, RecurrenceRule.next_run_at <= today)
        .all()
    )

    created = 0
    for rule in rules:
        template = db.get(WorkItem, rule.template_item_id)
        if not template:
            rule.enabled = False
            continue

        project = db.get(Project, rule.project_id)
        if not project:
            rule.enabled = False
            continue

        # Increment item counter
        project.item_counter += 1
        new_number = project.item_counter

        # Clone item
        new_item = WorkItem(
            project_id=project.id,
            item_number=new_number,
            title=template.title,
            description=template.description,
            status_id=template.status_id,
            priority=template.priority,
            position="a0",
            due_date=rule.next_run_at,
            created_by_id=rule.created_by_id,
        )
        db.add(new_item)
        db.flush()

        # Copy assignees
        for assignee in template.assignees:
            db.add(WorkItemAssignee(work_item_id=new_item.id, user_id=assignee.id))

        # Copy labels
        for label in template.labels:
            db.add(WorkItemLabel(work_item_id=new_item.id, label_id=label.id))

        record_activity(db, new_item.id, rule.created_by_id, "created")

        # Advance next_run_at
        rule.next_run_at = _compute_next_run(rule.next_run_at, rule.frequency)

        _broadcast(project.id, "item_created", new_number)
        created += 1

    db.commit()
    return RecurrenceProcessResponse(created=created)
