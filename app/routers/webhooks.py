from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import User, Workspace, WebhookConfig
from app.schemas import WebhookConfigCreate, WebhookConfigResponse, WebhookConfigUpdate

router = APIRouter(tags=["webhooks"])


@router.get(
    "/workspaces/{ws_slug}/webhooks",
    response_model=list[WebhookConfigResponse],
)
def list_webhooks(
    ws_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List webhook configurations. Requires admin role."""
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")
    return db.query(WebhookConfig).filter_by(workspace_id=ws.id).all()


@router.post(
    "/workspaces/{ws_slug}/webhooks",
    response_model=WebhookConfigResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_webhook(
    ws_slug: str,
    body: WebhookConfigCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a webhook configuration. Requires admin role."""
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    webhook = WebhookConfig(
        workspace_id=ws.id,
        url=body.url,
        event_types=body.event_types,
        active=body.active,
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return webhook


@router.patch(
    "/workspaces/{ws_slug}/webhooks/{webhook_id}",
    response_model=WebhookConfigResponse,
)
def update_webhook(
    ws_slug: str,
    webhook_id: int,
    body: WebhookConfigUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a webhook configuration. Requires admin role."""
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    webhook = db.query(WebhookConfig).filter_by(id=webhook_id, workspace_id=ws.id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(webhook, k, v)
    db.commit()
    db.refresh(webhook)
    return webhook


@router.delete(
    "/workspaces/{ws_slug}/webhooks/{webhook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_webhook(
    ws_slug: str,
    webhook_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a webhook configuration. Requires admin role."""
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    webhook = db.query(WebhookConfig).filter_by(id=webhook_id, workspace_id=ws.id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(webhook)
    db.commit()
