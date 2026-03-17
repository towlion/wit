import datetime
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

import asyncio

from app.activity import record_activity
from app.automation import run_status_automations
from app.database import get_db
from app.deps import get_current_user, get_project_role, get_workspace_member
from app.models import Label, Project, Subtask, User, Workspace, WorkflowState, WorkItem, WorkItemAssignee, WorkItemDependency, WorkItemLabel
from app.schemas import DependencyCreate, DependencyItem, DependencyResponse, SubtaskCreate, SubtaskResponse, SubtaskUpdate, WorkItemCreate, WorkItemResponse, WorkItemUpdate

from app.websocket import manager as ws_manager

router = APIRouter(tags=["work_items"])


def _broadcast(project_id: int, event_type: str, item_number: int):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast(project_id, {"type": event_type, "item_number": item_number}))
    except RuntimeError:
        pass


def _get_dependencies(db: Session, item_id: int) -> dict:
    blocks_rows = (
        db.query(WorkItemDependency, WorkItem)
        .join(WorkItem, WorkItem.id == WorkItemDependency.blocked_item_id)
        .filter(WorkItemDependency.blocking_item_id == item_id)
        .all()
    )
    blocked_by_rows = (
        db.query(WorkItemDependency, WorkItem)
        .join(WorkItem, WorkItem.id == WorkItemDependency.blocking_item_id)
        .filter(WorkItemDependency.blocked_item_id == item_id)
        .all()
    )
    return {
        "blocks": [
            DependencyItem(item_id=wi.id, item_number=wi.item_number, title=wi.title)
            for _, wi in blocks_rows
        ],
        "blocked_by": [
            DependencyItem(item_id=wi.id, item_number=wi.item_number, title=wi.title)
            for _, wi in blocked_by_rows
        ],
    }


def _item_response(db: Session, item: WorkItem) -> dict:
    data = WorkItemResponse.model_validate(item).model_dump()
    data.update(_get_dependencies(db, item.id))
    total = db.query(Subtask).filter_by(work_item_id=item.id).count()
    completed = db.query(Subtask).filter_by(work_item_id=item.id, completed=True).count()
    data["subtask_summary"] = {"total": total, "completed": completed}
    return data


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session, min_role: str = "viewer") -> Project:
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if min_role != "viewer":
        get_project_role(project.id, user.id, db, ws.id, min_role=min_role)
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
    sort_by: str | None = Query(None),
    sort_dir: str = Query("asc"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List non-archived work items in a project.

    Supports filtering by due date range and overdue status.
    Supports sorting by title, priority, due_date, created_at, or item_number.
    """
    project = _resolve_project(ws_slug, project_slug, user, db)
    q = db.query(WorkItem).filter_by(project_id=project.id, archived=False)
    if overdue:
        q = q.filter(WorkItem.due_date < datetime.date.today(), WorkItem.due_date.isnot(None))
    if due_before:
        q = q.filter(WorkItem.due_date <= due_before, WorkItem.due_date.isnot(None))
    if due_after:
        q = q.filter(WorkItem.due_date >= due_after, WorkItem.due_date.isnot(None))

    sort_columns = {
        "title": WorkItem.title,
        "due_date": WorkItem.due_date,
        "created_at": WorkItem.created_at,
        "item_number": WorkItem.item_number,
    }
    if sort_by == "priority":
        priority_order = case(
            (WorkItem.priority == "urgent", 0),
            (WorkItem.priority == "high", 1),
            (WorkItem.priority == "medium", 2),
            (WorkItem.priority == "low", 3),
            else_=4,
        )
        order_col = priority_order.desc() if sort_dir == "desc" else priority_order.asc()
        q = q.order_by(order_col)
    elif sort_by in sort_columns:
        col = sort_columns[sort_by]
        order_col = col.desc().nullslast() if sort_dir == "desc" else col.asc().nullslast()
        q = q.order_by(order_col)
    else:
        q = q.order_by(WorkItem.position)

    items = q.all()

    if not items:
        return []

    item_ids = [i.id for i in items]

    # Batch load dependencies (2 queries total, not 2×N)
    blocks_rows = (
        db.query(WorkItemDependency, WorkItem)
        .join(WorkItem, WorkItem.id == WorkItemDependency.blocked_item_id)
        .filter(WorkItemDependency.blocking_item_id.in_(item_ids))
        .all()
    )
    blocked_by_rows = (
        db.query(WorkItemDependency, WorkItem)
        .join(WorkItem, WorkItem.id == WorkItemDependency.blocking_item_id)
        .filter(WorkItemDependency.blocked_item_id.in_(item_ids))
        .all()
    )

    blocks_map: dict[int, list] = defaultdict(list)
    for dep, wi in blocks_rows:
        blocks_map[dep.blocking_item_id].append(
            DependencyItem(item_id=wi.id, item_number=wi.item_number, title=wi.title)
        )
    blocked_by_map: dict[int, list] = defaultdict(list)
    for dep, wi in blocked_by_rows:
        blocked_by_map[dep.blocked_item_id].append(
            DependencyItem(item_id=wi.id, item_number=wi.item_number, title=wi.title)
        )

    # Batch subtask summary (1 query, not 2×N)
    subtask_stats = (
        db.query(
            Subtask.work_item_id,
            func.count().label("total"),
            func.count(case((Subtask.completed == True, 1))).label("completed"),
        )
        .filter(Subtask.work_item_id.in_(item_ids))
        .group_by(Subtask.work_item_id)
        .all()
    )
    subtask_map = {row.work_item_id: {"total": row.total, "completed": row.completed} for row in subtask_stats}

    result = []
    for item in items:
        data = WorkItemResponse.model_validate(item).model_dump()
        data["blocks"] = blocks_map.get(item.id, [])
        data["blocked_by"] = blocked_by_map.get(item.id, [])
        data["subtask_summary"] = subtask_map.get(item.id, {"total": 0, "completed": 0})
        result.append(data)
    return result


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
    """Create a new work item.

    Assigns an auto-incrementing item number and defaults to the first workflow state.
    """
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")

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
        sprint_id=body.sprint_id,
        story_points=body.story_points,
        created_by_id=user.id,
    )
    db.add(item)
    db.flush()
    record_activity(db, item.id, user.id, "created")
    db.commit()
    db.refresh(item)
    _broadcast(project.id, "item_created", item.item_number)
    return _item_response(db, item)


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
    """Get a work item by number, including dependencies and subtask summary."""
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return _item_response(db, item)


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
    """Update a work item. Records activity for status and priority changes.

    Triggers automation rules on status changes.
    """
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
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

    if "due_date" in update_data:
        old_due = str(item.due_date) if item.due_date else "none"
        new_due = str(update_data["due_date"]) if update_data["due_date"] else "none"
        if old_due != new_due:
            record_activity(db, item.id, user.id, "due_date_change", old_value=old_due, new_value=new_due)

    if "archived" in update_data and update_data["archived"] and not item.archived:
        record_activity(db, item.id, user.id, "archived")

    for field in ("title", "description", "status_id", "priority", "position", "archived", "due_date", "sprint_id", "story_points"):
        if field in update_data:
            setattr(item, field, update_data[field])

    if new_status_id is not None:
        run_status_automations(db, item, new_status_id, user.id)

    db.commit()
    db.refresh(item)
    _broadcast(project.id, "item_updated", item.item_number)
    return _item_response(db, item)


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
    """Permanently delete a work item."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
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
    """Assign a user to a work item.

    - **409**: Already assigned
    """
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
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
    """Remove a user's assignment from a work item."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
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
    """Apply a label to a work item.

    - **409**: Label already applied
    """
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
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
    """Remove a label from a work item."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
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


# --- Dependencies ---
@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/dependencies",
    response_model=DependencyResponse,
)
def list_dependencies(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dependency graph for a work item (blocks and blocked-by)."""
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return _get_dependencies(db, item.id)


def _would_create_cycle(db: Session, blocking_id: int, blocked_id: int) -> bool:
    """Check if adding blocking_id→blocked_id would create a cycle."""
    visited: set[int] = set()
    queue = [blocked_id]
    while queue:
        current = queue.pop(0)
        if current == blocking_id:
            return True
        if current in visited:
            continue
        visited.add(current)
        successors = (
            db.query(WorkItemDependency.blocked_item_id)
            .filter(WorkItemDependency.blocking_item_id == current)
            .all()
        )
        queue.extend(s[0] for s in successors)
    return False


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/dependencies",
    status_code=status.HTTP_201_CREATED,
)
def add_dependency(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    body: DependencyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a dependency (this item blocks another).

    - **400**: Self-dependency
    - **409**: Already exists or would create a cycle
    """
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    blocked = db.query(WorkItem).filter_by(project_id=project.id, item_number=body.blocks_item_number).first()
    if not blocked:
        raise HTTPException(status_code=404, detail="Target item not found")
    if item.id == blocked.id:
        raise HTTPException(status_code=400, detail="Cannot create self-dependency")
    existing = db.query(WorkItemDependency).filter_by(
        blocking_item_id=item.id, blocked_item_id=blocked.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Dependency already exists")
    if _would_create_cycle(db, item.id, blocked.id):
        raise HTTPException(status_code=409, detail="Dependency would create a cycle")
    db.add(WorkItemDependency(blocking_item_id=item.id, blocked_item_id=blocked.id))
    db.commit()
    _broadcast(project.id, "item_updated", item.item_number)
    _broadcast(project.id, "item_updated", blocked.item_number)
    return {"ok": True}


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/dependencies/{related_item_number}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_dependency(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    related_item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a dependency between two items (either direction)."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    related = db.query(WorkItem).filter_by(project_id=project.id, item_number=related_item_number).first()
    if not related:
        raise HTTPException(status_code=404, detail="Related item not found")
    dep = db.query(WorkItemDependency).filter(
        ((WorkItemDependency.blocking_item_id == item.id) & (WorkItemDependency.blocked_item_id == related.id))
        | ((WorkItemDependency.blocking_item_id == related.id) & (WorkItemDependency.blocked_item_id == item.id))
    ).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    db.delete(dep)
    db.commit()
    _broadcast(project.id, "item_updated", item.item_number)
    _broadcast(project.id, "item_updated", related.item_number)


# --- Subtasks ---
@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks",
    response_model=list[SubtaskResponse],
)
def list_subtasks(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List subtasks for a work item, ordered by position."""
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return db.query(Subtask).filter_by(work_item_id=item.id).order_by(Subtask.position).all()


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks",
    response_model=SubtaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subtask(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    body: SubtaskCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a subtask / checklist item. Auto-positioned at the end."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    from sqlalchemy import func as sa_func
    max_pos = db.query(sa_func.coalesce(sa_func.max(Subtask.position), -1)).filter_by(work_item_id=item.id).scalar()
    subtask = Subtask(
        work_item_id=item.id,
        title=body.title,
        position=max_pos + 1,
    )
    db.add(subtask)
    record_activity(db, item.id, user.id, "subtask_added", new_value=body.title)
    db.commit()
    db.refresh(subtask)
    _broadcast(project.id, "item_updated", item.item_number)
    return subtask


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks/{subtask_id}",
    response_model=SubtaskResponse,
)
def update_subtask(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    subtask_id: int,
    body: SubtaskUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a subtask's title, position, or completion status."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    subtask = db.query(Subtask).filter_by(id=subtask_id, work_item_id=item.id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    if body.title is not None:
        subtask.title = body.title
    if body.position is not None:
        subtask.position = body.position
    if body.completed is not None and body.completed != subtask.completed:
        subtask.completed = body.completed
        if body.completed:
            record_activity(db, item.id, user.id, "subtask_completed", new_value=subtask.title)
    db.commit()
    db.refresh(subtask)
    _broadcast(project.id, "item_updated", item.item_number)
    return subtask


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks/{subtask_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_subtask(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    subtask_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a subtask."""
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    subtask = db.query(Subtask).filter_by(id=subtask_id, work_item_id=item.id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(subtask)
    db.commit()
    _broadcast(project.id, "item_updated", item.item_number)
