import csv
import io
import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.activity import record_activity
from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import (
    CustomFieldDefinition,
    CustomFieldValue,
    Label,
    Project,
    Subtask,
    User,
    Workspace,
    WorkflowState,
    WorkItem,
    WorkItemAssignee,
    WorkItemDependency,
    WorkItemLabel,
    WorkspaceMember,
)
from app.schemas import ImportCsvResponse, ImportJsonResponse

router = APIRouter(tags=["import-export"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ws, project


@router.get("/workspaces/{ws_slug}/projects/{project_slug}/export.json")
def export_json(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws, project = _resolve_project(ws_slug, project_slug, user, db)

    states = db.query(WorkflowState).filter_by(project_id=project.id).order_by(WorkflowState.position).all()
    labels = db.query(Label).filter_by(project_id=project.id).all()
    items = (
        db.query(WorkItem)
        .filter(WorkItem.project_id == project.id, WorkItem.archived == False)
        .order_by(WorkItem.item_number)
        .all()
    )

    states_map = {s.id: s.name for s in states}

    # Build dependency map
    deps = db.query(WorkItemDependency).all()
    item_ids = {i.id for i in items}
    item_id_to_number = {i.id: i.item_number for i in items}
    blocks_map: dict[int, list[int]] = {}
    for d in deps:
        if d.blocking_item_id in item_ids and d.blocked_item_id in item_ids:
            blocks_map.setdefault(d.blocking_item_id, []).append(item_id_to_number[d.blocked_item_id])

    # Custom fields
    field_defs = db.query(CustomFieldDefinition).filter_by(project_id=project.id).all()
    field_map = {f.id: f.name for f in field_defs}

    # Batch-load subtasks and custom field values
    item_ids_list = [i.id for i in items]
    all_subtasks = (
        db.query(Subtask).filter(Subtask.work_item_id.in_(item_ids_list))
        .order_by(Subtask.work_item_id, Subtask.position).all()
    ) if item_ids_list else []
    subtasks_by_item: dict[int, list] = {}
    for s in all_subtasks:
        subtasks_by_item.setdefault(s.work_item_id, []).append(s)

    all_custom_values = (
        db.query(CustomFieldValue).filter(CustomFieldValue.work_item_id.in_(item_ids_list)).all()
    ) if item_ids_list else []
    cfv_by_item: dict[int, list] = {}
    for cv in all_custom_values:
        cfv_by_item.setdefault(cv.work_item_id, []).append(cv)

    items_data = []
    for item in items:
        subtasks = subtasks_by_item.get(item.id, [])
        custom_values = cfv_by_item.get(item.id, [])

        item_data = {
            "item_number": item.item_number,
            "title": item.title,
            "description": item.description,
            "status": states_map.get(item.status_id, ""),
            "priority": item.priority,
            "due_date": str(item.due_date) if item.due_date else None,
            "created_at": item.created_at.isoformat(),
            "assignees": [{"email": a.email, "display_name": a.display_name} for a in item.assignees],
            "labels": [l.name for l in item.labels],
            "blocks": blocks_map.get(item.id, []),
            "subtasks": [{"title": s.title, "completed": s.completed} for s in subtasks],
            "custom_fields": {
                field_map.get(cv.field_id, ""): cv.value_text or (cv.value_number if cv.value_number is not None else (str(cv.value_date) if cv.value_date else None))
                for cv in custom_values
                if cv.field_id in field_map
            },
        }
        items_data.append(item_data)

    export_data = {
        "project": {
            "name": project.name,
            "slug": project.slug,
            "description": project.description,
            "template": project.template,
        },
        "states": [
            {"name": s.name, "category": s.category, "position": s.position, "color": s.color}
            for s in states
        ],
        "labels": [{"name": l.name, "color": l.color} for l in labels],
        "items": items_data,
    }

    content = json.dumps(export_data, indent=2)
    filename = f"{project.slug}-export.json"
    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/workspaces/{ws_slug}/projects/{project_slug}/import/csv")
def import_csv(
    ws_slug: str,
    project_slug: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportCsvResponse:
    ws, project = _resolve_project(ws_slug, project_slug, user, db)

    content = file.file.read(1024 * 1024 + 1)
    if len(content) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 1MB)")

    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if "title" not in (reader.fieldnames or []):
        raise HTTPException(status_code=400, detail="CSV must have a 'title' column")

    states = db.query(WorkflowState).filter_by(project_id=project.id).order_by(WorkflowState.position).all()
    states_map = {s.name.lower(): s.id for s in states}
    default_state_id = states[0].id if states else None

    members = (
        db.query(User)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == ws.id)
        .all()
    )
    members_map = {m.email.lower(): m.id for m in members}

    existing_labels = db.query(Label).filter_by(project_id=project.id).all()
    labels_map = {l.name.lower(): l.id for l in existing_labels}

    created_count = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        title = (row.get("title") or "").strip()
        if not title:
            errors.append({"row": row_num, "message": "Missing title"})
            continue

        project.item_counter += 1
        item_number = project.item_counter

        status_name = (row.get("status") or "").strip().lower()
        status_id = states_map.get(status_name, default_state_id)

        priority = (row.get("priority") or "medium").strip().lower()
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"

        due_date_str = (row.get("due_date") or "").strip()
        due_date = None
        if due_date_str:
            try:
                due_date = date.fromisoformat(due_date_str)
            except ValueError:
                errors.append({"row": row_num, "message": f"Invalid due_date: {due_date_str}"})

        item = WorkItem(
            project_id=project.id,
            item_number=item_number,
            title=title,
            description=(row.get("description") or "").strip() or None,
            status_id=status_id,
            priority=priority,
            position="a0",
            due_date=due_date,
            created_by_id=user.id,
        )
        db.add(item)
        db.flush()

        # Assignees
        assignee_str = (row.get("assignees") or "").strip()
        if assignee_str:
            for email in assignee_str.split(","):
                email = email.strip().lower()
                uid = members_map.get(email)
                if uid:
                    db.add(WorkItemAssignee(work_item_id=item.id, user_id=uid))

        # Labels
        label_str = (row.get("labels") or "").strip()
        if label_str:
            for lname in label_str.split(","):
                lname = lname.strip()
                if not lname:
                    continue
                lid = labels_map.get(lname.lower())
                if not lid:
                    new_label = Label(project_id=project.id, name=lname)
                    db.add(new_label)
                    db.flush()
                    labels_map[lname.lower()] = new_label.id
                    lid = new_label.id
                db.add(WorkItemLabel(work_item_id=item.id, label_id=lid))

        record_activity(db, item.id, user.id, "created")
        created_count += 1

    db.commit()
    return ImportCsvResponse(created=created_count, errors=errors)


@router.post("/workspaces/{ws_slug}/projects/{project_slug}/import/json")
def import_json(
    ws_slug: str,
    project_slug: str,
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportJsonResponse:
    ws, project = _resolve_project(ws_slug, project_slug, user, db)

    # Create/match states
    existing_states = db.query(WorkflowState).filter_by(project_id=project.id).all()
    states_map = {s.name.lower(): s.id for s in existing_states}
    default_state_id = existing_states[0].id if existing_states else None
    states_created = 0

    for s_data in data.get("states", []):
        name = s_data.get("name", "").strip()
        if not name or name.lower() in states_map:
            continue
        new_state = WorkflowState(
            project_id=project.id,
            name=name,
            category=s_data.get("category", "todo"),
            position=s_data.get("position", len(existing_states) + states_created),
            color=s_data.get("color", "#6b7280"),
        )
        db.add(new_state)
        db.flush()
        states_map[name.lower()] = new_state.id
        if default_state_id is None:
            default_state_id = new_state.id
        states_created += 1

    # Create/match labels
    existing_labels = db.query(Label).filter_by(project_id=project.id).all()
    labels_map = {l.name.lower(): l.id for l in existing_labels}
    labels_created = 0

    for l_data in data.get("labels", []):
        name = l_data.get("name", "").strip()
        if not name or name.lower() in labels_map:
            continue
        new_label = Label(
            project_id=project.id,
            name=name,
            color=l_data.get("color", "#6b7280"),
        )
        db.add(new_label)
        db.flush()
        labels_map[name.lower()] = new_label.id
        labels_created += 1

    # Members for assignee matching
    members = (
        db.query(User)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == ws.id)
        .all()
    )
    members_map = {m.email.lower(): m.id for m in members}

    # Import items
    created_count = 0
    old_number_to_new_id: dict[int, int] = {}

    for item_data in data.get("items", []):
        title = item_data.get("title", "").strip()
        if not title:
            continue

        project.item_counter += 1
        item_number = project.item_counter

        status_name = (item_data.get("status") or "").strip().lower()
        status_id = states_map.get(status_name, default_state_id)

        priority = (item_data.get("priority") or "medium").strip().lower()
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"

        due_date = None
        if item_data.get("due_date"):
            try:
                due_date = date.fromisoformat(item_data["due_date"])
            except ValueError:
                pass

        item = WorkItem(
            project_id=project.id,
            item_number=item_number,
            title=title,
            description=item_data.get("description"),
            status_id=status_id,
            priority=priority,
            position="a0",
            due_date=due_date,
            created_by_id=user.id,
        )
        db.add(item)
        db.flush()

        old_number = item_data.get("item_number")
        if old_number is not None:
            old_number_to_new_id[old_number] = item.id

        # Assignees
        for a in item_data.get("assignees", []):
            email = (a.get("email") or "").strip().lower()
            uid = members_map.get(email)
            if uid:
                db.add(WorkItemAssignee(work_item_id=item.id, user_id=uid))

        # Labels
        for lname in item_data.get("labels", []):
            lid = labels_map.get(lname.lower())
            if lid:
                db.add(WorkItemLabel(work_item_id=item.id, label_id=lid))

        # Subtasks
        for s_data in item_data.get("subtasks", []):
            db.add(Subtask(
                work_item_id=item.id,
                title=s_data.get("title", ""),
                completed=s_data.get("completed", False),
            ))

        record_activity(db, item.id, user.id, "created")
        created_count += 1

    # Dependencies (using old item_number -> new id mapping)
    for item_data in data.get("items", []):
        old_number = item_data.get("item_number")
        if old_number is None or old_number not in old_number_to_new_id:
            continue
        blocking_id = old_number_to_new_id[old_number]
        for blocked_number in item_data.get("blocks", []):
            blocked_id = old_number_to_new_id.get(blocked_number)
            if blocked_id and blocking_id != blocked_id:
                db.add(WorkItemDependency(blocking_item_id=blocking_id, blocked_item_id=blocked_id))

    db.commit()
    return ImportJsonResponse(
        created=created_count,
        states_created=states_created,
        labels_created=labels_created,
    )
