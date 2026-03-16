from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import CustomFieldDefinition, CustomFieldValue, Project, User, Workspace, WorkItem
from app.schemas import (
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionResponse,
    CustomFieldDefinitionUpdate,
    CustomFieldValueResponse,
    CustomFieldValueSet,
)

router = APIRouter(tags=["custom_fields"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session) -> Project:
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# --- Field Definitions ---

@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/fields",
    response_model=list[CustomFieldDefinitionResponse],
)
def list_fields(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    return (
        db.query(CustomFieldDefinition)
        .filter_by(project_id=project.id)
        .order_by(CustomFieldDefinition.position)
        .all()
    )


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/fields",
    response_model=CustomFieldDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_field(
    ws_slug: str,
    project_slug: str,
    body: CustomFieldDefinitionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    existing = db.query(CustomFieldDefinition).filter_by(project_id=project.id, name=body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Field with this name already exists")

    field = CustomFieldDefinition(
        project_id=project.id,
        name=body.name,
        field_type=body.field_type,
        options=body.options,
        required=body.required,
        position=body.position,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/fields/{field_id}",
    response_model=CustomFieldDefinitionResponse,
)
def update_field(
    ws_slug: str,
    project_slug: str,
    field_id: int,
    body: CustomFieldDefinitionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    field = db.query(CustomFieldDefinition).filter_by(id=field_id, project_id=project.id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(field, k, v)
    db.commit()
    db.refresh(field)
    return field


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/fields/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_field(
    ws_slug: str,
    project_slug: str,
    field_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    field = db.query(CustomFieldDefinition).filter_by(id=field_id, project_id=project.id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(field)
    db.commit()


# --- Field Values on Items ---

@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/fields",
    response_model=list[CustomFieldValueResponse],
)
def get_item_fields(
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
    return db.query(CustomFieldValue).filter_by(work_item_id=item.id).all()


@router.put(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/fields/{field_id}",
    response_model=CustomFieldValueResponse,
)
def set_field_value(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    field_id: int,
    body: CustomFieldValueSet,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    field = db.query(CustomFieldDefinition).filter_by(id=field_id, project_id=project.id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    val = db.query(CustomFieldValue).filter_by(work_item_id=item.id, field_id=field_id).first()
    if not val:
        val = CustomFieldValue(work_item_id=item.id, field_id=field_id)
        db.add(val)

    val.value_text = body.value_text
    val.value_number = body.value_number
    val.value_date = body.value_date
    db.commit()
    db.refresh(val)
    return val


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/fields/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def clear_field_value(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    field_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    val = db.query(CustomFieldValue).filter_by(work_item_id=item.id, field_id=field_id).first()
    if val:
        db.delete(val)
        db.commit()
