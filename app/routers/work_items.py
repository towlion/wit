from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import Label, Project, User, Workspace, WorkItem, WorkItemAssignee, WorkItemLabel
from app.schemas import WorkItemCreate, WorkItemResponse, WorkItemUpdate

router = APIRouter(tags=["work_items"])


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
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    return (
        db.query(WorkItem)
        .filter_by(project_id=project.id, archived=False)
        .order_by(WorkItem.position)
        .all()
    )


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
        created_by_id=user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
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

    for field in ("title", "description", "status_id", "priority", "position", "archived"):
        val = getattr(body, field, None)
        if val is not None:
            setattr(item, field, val)

    db.commit()
    db.refresh(item)
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
    db.delete(item)
    db.commit()


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
    db.add(WorkItemAssignee(work_item_id=item.id, user_id=user_id))
    db.commit()
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
    db.delete(assn)
    db.commit()


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
    db.add(WorkItemLabel(work_item_id=item.id, label_id=label_id))
    db.commit()
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
    db.delete(wil)
    db.commit()
