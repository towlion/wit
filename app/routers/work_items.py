import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import asyncio

from app.activity import record_activity
from app.automation import run_status_automations
from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import Label, Project, User, Workspace, WorkflowState, WorkItem, WorkItemAssignee, WorkItemLabel
from app.schemas import WorkItemCreate, WorkItemResponse, WorkItemUpdate

from app.websocket import manager as ws_manager

router = APIRouter(tags=["work_items"])


def _broadcast(project_id: int, event_type: str, item_number: int):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast(project_id, {"type": event_type, "item_number": item_number}))
    except RuntimeError:
        pass


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session) -> Project:
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items",
    response_model=list[WorkItemResponse],
)
def list_items(
    ws_slug: str,
    project_slug: str,
    overdue: bool = Query(False),
    due_before: datetime.date | None = Query(None),
    due_after: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    q = db.query(WorkItem).filter_by(project_id=project.id, archived=False)
    if overdue:
        q = q.filter(WorkItem.due_date < datetime.date.today(), WorkItem.due_date.isnot(None))
    if due_before:
        q = q.filter(WorkItem.due_date <= due_before, WorkItem.due_date.isnot(None))
    if due_after:
        q = q.filter(WorkItem.due_date >= due_after, WorkItem.due_date.isnot(None))
    return q.order_by(WorkItem.position).all()


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/items",
    response_model=WorkItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    ws_slug: str,
    project_slug: str,
    body: WorkItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)

    # Atomically increment item_counter
    project.item_counter += 1
    item_number = project.item_counter

    # Default to first workflow state if not specified
    status_id = body.status_id
    if status_id is None and project.workflow_states:
        status_id = project.workflow_states[0].id

    item = WorkItem(
        project_id=project.id,
        item_number=item_number,
        title=body.title,
        description=body.description,
        status_id=status_id,
        priority=body.priority,
        due_date=body.due_date,
        created_by_id=user.id,
    )
    db.add(item)
    db.flush()
    record_activity(db, item.id, user.id, "created")
    db.commit()
    db.refresh(item)
    _broadcast(project.id, "item_created", item.item_number)
    return item


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}",
    response_model=WorkItemResponse,
)
def get_item(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}",
    response_model=WorkItemResponse,
)
def update_item(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    body: WorkItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = body.model_dump(exclude_unset=True)

    new_status_id = None
    if "status_id" in update_data and update_data["status_id"] != item.status_id:
        new_status_id = update_data["status_id"]
        old_state = db.get(WorkflowState, item.status_id)
        new_state = db.get(WorkflowState, new_status_id)
        record_activity(
            db, item.id, user.id, "status_change",
            old_value=old_state.name if old_state else str(item.status_id),
            new_value=new_state.name if new_state else str(new_status_id),
        )

    if "priority" in update_data and update_data["priority"] != item.priority:
        record_activity(
            db, item.id, user.id, "priority_change",
            old_value=item.priority, new_value=update_data["priority"],
        )

    if "archived" in update_data and update_data["archived"] and not item.archived:
        record_activity(db, item.id, user.id, "archived")

    for field in ("title", "description", "status_id", "priority", "position", "archived", "due_date"):
        if field in update_data:
            setattr(item, field, update_data[field])

    if new_status_id is not None:
        run_status_automations(db, item, new_status_id, user.id)

    db.commit()
    db.refresh(item)
    _broadcast(project.id, "item_updated", item.item_number)
    return item


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_item(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item_number = item.item_number
    db.delete(item)
    db.commit()
    _broadcast(project.id, "item_deleted", item_number)


# --- Assignees ---
@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/assignees/{user_id}",
    status_code=status.HTTP_201_CREATED,
)
def add_assignee(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if db.query(WorkItemAssignee).filter_by(work_item_id=item.id, user_id=user_id).first():
        raise HTTPException(status_code=409, detail="Already assigned")
    assignee_user = db.get(User, user_id)
    db.add(WorkItemAssignee(work_item_id=item.id, user_id=user_id))
    record_activity(
        db, item.id, user.id, "assignee_added",
        new_value=assignee_user.display_name if assignee_user else str(user_id),
    )
    db.commit()
    _broadcast(project.id, "item_updated", item.item_number)
    return {"ok": True}


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/assignees/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_assignee(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    assn = db.query(WorkItemAssignee).filter_by(work_item_id=item.id, user_id=user_id).first()
    if not assn:
        raise HTTPException(status_code=404, detail="Not assigned")
    removed_user = db.get(User, user_id)
    record_activity(
        db, item.id, user.id, "assignee_removed",
        old_value=removed_user.display_name if removed_user else str(user_id),
    )
    db.delete(assn)
    db.commit()
    _broadcast(project.id, "item_updated", item.item_number)


# --- Labels ---
@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/labels/{label_id}",
    status_code=status.HTTP_201_CREATED,
)
def add_item_label(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    label_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not db.get(Label, label_id):
        raise HTTPException(status_code=404, detail="Label not found")
    if db.query(WorkItemLabel).filter_by(work_item_id=item.id, label_id=label_id).first():
        raise HTTPException(status_code=409, detail="Label already applied")
    label = db.get(Label, label_id)
    db.add(WorkItemLabel(work_item_id=item.id, label_id=label_id))
    record_activity(
        db, item.id, user.id, "label_added",
        new_value=label.name if label else str(label_id),
    )
    db.commit()
    _broadcast(project.id, "item_updated", item.item_number)
    return {"ok": True}


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/labels/{label_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_item_label(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    label_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    wil = db.query(WorkItemLabel).filter_by(work_item_id=item.id, label_id=label_id).first()
    if not wil:
        raise HTTPException(status_code=404, detail="Label not applied")
    label = db.get(Label, label_id)
    record_activity(
        db, item.id, user.id, "label_removed",
        old_value=label.name if label else str(label_id),
    )
    db.delete(wil)
    db.commit()
    _broadcast(project.id, "item_updated", item.item_number)
