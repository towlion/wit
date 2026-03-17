from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import AutomationRule, ItemTemplate, Project, User, Workspace
from app.schemas import (
    AutomationRuleCreate,
    AutomationRuleResponse,
    AutomationRuleUpdate,
    ItemTemplateCreate,
    ItemTemplateResponse,
    ItemTemplateUpdate,
)

router = APIRouter(tags=["templates"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session, min_role: str = "member") -> Project:
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role=min_role)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# --- Item Templates ---

@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/templates",
    response_model=list[ItemTemplateResponse],
)
def list_templates(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    return db.query(ItemTemplate).filter_by(project_id=project.id).order_by(ItemTemplate.name).all()


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/templates",
    response_model=ItemTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_template(
    ws_slug: str,
    project_slug: str,
    body: ItemTemplateCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    tmpl = ItemTemplate(
        project_id=project.id,
        name=body.name,
        title_template=body.title_template,
        description_template=body.description_template,
        priority=body.priority,
        label_ids=body.label_ids,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/templates/{template_id}",
    response_model=ItemTemplateResponse,
)
def update_template(
    ws_slug: str,
    project_slug: str,
    template_id: int,
    body: ItemTemplateUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    tmpl = db.query(ItemTemplate).filter_by(id=template_id, project_id=project.id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for field in ("name", "title_template", "description_template", "priority", "label_ids"):
        val = getattr(body, field, None)
        if val is not None:
            setattr(tmpl, field, val)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_template(
    ws_slug: str,
    project_slug: str,
    template_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    tmpl = db.query(ItemTemplate).filter_by(id=template_id, project_id=project.id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tmpl)
    db.commit()


# --- Automation Rules ---

@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/automations",
    response_model=list[AutomationRuleResponse],
)
def list_automations(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    return db.query(AutomationRule).filter_by(project_id=project.id).order_by(AutomationRule.id).all()


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/automations",
    response_model=AutomationRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_automation(
    ws_slug: str,
    project_slug: str,
    body: AutomationRuleCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    rule = AutomationRule(
        project_id=project.id,
        name=body.name,
        trigger=body.trigger,
        trigger_state_id=body.trigger_state_id,
        action=body.action,
        action_config=body.action_config,
        enabled=body.enabled,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/automations/{rule_id}",
    response_model=AutomationRuleResponse,
)
def update_automation(
    ws_slug: str,
    project_slug: str,
    rule_id: int,
    body: AutomationRuleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    rule = db.query(AutomationRule).filter_by(id=rule_id, project_id=project.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for field in ("name", "trigger", "trigger_state_id", "action", "action_config", "enabled"):
        val = getattr(body, field, None)
        if val is not None:
            setattr(rule, field, val)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/automations/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_automation(
    ws_slug: str,
    project_slug: str,
    rule_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    rule = db.query(AutomationRule).filter_by(id=rule_id, project_id=project.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
