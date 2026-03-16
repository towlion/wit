from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import Attachment, Project, User, Workspace, WorkItem
from app.schemas import AttachmentResponse
from app.storage import delete_file, get_presigned_url, upload_file

router = APIRouter(tags=["attachments"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def _resolve_item(ws_slug: str, project_slug: str, item_number: int, user: User, db: Session) -> WorkItem:
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    item = db.query(WorkItem).filter_by(project_id=project.id, item_number=item_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments",
    response_model=list[AttachmentResponse],
)
def list_attachments(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    return db.query(Attachment).filter_by(work_item_id=item.id).order_by(Attachment.created_at.desc()).all()


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "unnamed"
    storage_key = upload_file(data, filename, content_type)

    attachment = Attachment(
        work_item_id=item.id,
        filename=filename,
        content_type=content_type,
        size_bytes=len(data),
        storage_key=storage_key,
        uploaded_by_id=user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments/{attachment_id}/download",
)
def download_attachment(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    attachment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    att = db.query(Attachment).filter_by(id=attachment_id, work_item_id=item.id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    url = get_presigned_url(att.storage_key)
    return RedirectResponse(url=url)


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attachment(
    ws_slug: str,
    project_slug: str,
    item_number: int,
    attachment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _resolve_item(ws_slug, project_slug, item_number, user, db)
    att = db.query(Attachment).filter_by(id=attachment_id, work_item_id=item.id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if att.uploaded_by_id != user.id:
        raise HTTPException(status_code=403, detail="Can only delete own attachments")
    delete_file(att.storage_key)
    db.delete(att)
    db.commit()
