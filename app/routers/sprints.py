from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_project_role, get_workspace_member
from app.models import Project, Sprint, User, Workspace, WorkItem, WorkflowState
from app.schemas import SprintCreate, SprintResponse, SprintUpdate, SprintVelocityItem

router = APIRouter(tags=["sprints"])


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


def _batch_sprint_stats(db: Session, sprint_ids: list[int]) -> dict[int, dict]:
    if not sprint_ids:
        return {}
    totals = dict(
        db.query(WorkItem.sprint_id, func.count(WorkItem.id))
        .filter(WorkItem.sprint_id.in_(sprint_ids), WorkItem.archived == False)
        .group_by(WorkItem.sprint_id).all()
    )
    completed = dict(
        db.query(WorkItem.sprint_id, func.count(WorkItem.id))
        .join(WorkflowState, WorkItem.status_id == WorkflowState.id)
        .filter(WorkItem.sprint_id.in_(sprint_ids), WorkItem.archived == False, WorkflowState.category == "done")
        .group_by(WorkItem.sprint_id).all()
    )
    pts_total = dict(
        db.query(WorkItem.sprint_id, func.coalesce(func.sum(WorkItem.story_points), 0))
        .filter(WorkItem.sprint_id.in_(sprint_ids), WorkItem.archived == False)
        .group_by(WorkItem.sprint_id).all()
    )
    pts_completed = dict(
        db.query(WorkItem.sprint_id, func.coalesce(func.sum(WorkItem.story_points), 0))
        .join(WorkflowState, WorkItem.status_id == WorkflowState.id)
        .filter(WorkItem.sprint_id.in_(sprint_ids), WorkItem.archived == False, WorkflowState.category == "done")
        .group_by(WorkItem.sprint_id).all()
    )
    return {
        sid: {
            "item_count": totals.get(sid, 0),
            "completed_count": completed.get(sid, 0),
            "points_total": pts_total.get(sid, 0),
            "points_completed": pts_completed.get(sid, 0),
        }
        for sid in sprint_ids
    }


def _sprint_response(db: Session, sprint: Sprint) -> dict:
    stats = _batch_sprint_stats(db, [sprint.id]).get(sprint.id, {})
    data = SprintResponse.model_validate(sprint).model_dump()
    data["item_count"] = stats.get("item_count", 0)
    data["completed_count"] = stats.get("completed_count", 0)
    data["points_total"] = stats.get("points_total", 0)
    data["points_completed"] = stats.get("points_completed", 0)
    return data


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/sprints",
    response_model=list[SprintResponse],
)
def list_sprints(
    ws_slug: str,
    project_slug: str,
    status_filter: str | None = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    q = db.query(Sprint).filter_by(project_id=project.id)
    if status_filter:
        q = q.filter(Sprint.status == status_filter)
    sprints = q.order_by(Sprint.created_at.desc()).all()
    stats = _batch_sprint_stats(db, [s.id for s in sprints])
    result = []
    for s in sprints:
        data = SprintResponse.model_validate(s).model_dump()
        s_stats = stats.get(s.id, {})
        data["item_count"] = s_stats.get("item_count", 0)
        data["completed_count"] = s_stats.get("completed_count", 0)
        data["points_total"] = s_stats.get("points_total", 0)
        data["points_completed"] = s_stats.get("points_completed", 0)
        result.append(data)
    return result


@router.post(
    "/workspaces/{ws_slug}/projects/{project_slug}/sprints",
    response_model=SprintResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sprint(
    ws_slug: str,
    project_slug: str,
    body: SprintCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
    sprint = Sprint(
        project_id=project.id,
        name=body.name,
        start_date=body.start_date,
        end_date=body.end_date,
        goal=body.goal,
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return _sprint_response(db, sprint)


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/sprints/{sprint_id}",
    response_model=SprintResponse,
)
def get_sprint(
    ws_slug: str,
    project_slug: str,
    sprint_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    sprint = db.query(Sprint).filter_by(id=sprint_id, project_id=project.id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return _sprint_response(db, sprint)


@router.patch(
    "/workspaces/{ws_slug}/projects/{project_slug}/sprints/{sprint_id}",
    response_model=SprintResponse,
)
def update_sprint(
    ws_slug: str,
    project_slug: str,
    sprint_id: int,
    body: SprintUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="editor")
    sprint = db.query(Sprint).filter_by(id=sprint_id, project_id=project.id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    update_data = body.model_dump(exclude_unset=True)

    # Business rule: only one active sprint per project
    if update_data.get("status") == "active" and sprint.status != "active":
        current_active = (
            db.query(Sprint)
            .filter_by(project_id=project.id, status="active")
            .filter(Sprint.id != sprint.id)
            .first()
        )
        if current_active:
            current_active.status = "completed"

    for field in ("name", "start_date", "end_date", "status", "goal"):
        if field in update_data:
            setattr(sprint, field, update_data[field])

    db.commit()
    db.refresh(sprint)
    return _sprint_response(db, sprint)


@router.delete(
    "/workspaces/{ws_slug}/projects/{project_slug}/sprints/{sprint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_sprint(
    ws_slug: str,
    project_slug: str,
    sprint_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db, min_role="admin")
    sprint = db.query(Sprint).filter_by(id=sprint_id, project_id=project.id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    db.delete(sprint)
    db.commit()


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/sprints/velocity",
    response_model=list[SprintVelocityItem],
)
def sprint_velocity(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _resolve_project(ws_slug, project_slug, user, db)
    sprints = db.query(Sprint).filter_by(project_id=project.id).order_by(Sprint.created_at).all()
    stats = _batch_sprint_stats(db, [s.id for s in sprints])
    return [
        SprintVelocityItem(
            sprint_id=s.id,
            sprint_name=s.name,
            total_items=stats.get(s.id, {}).get("item_count", 0),
            completed_items=stats.get(s.id, {}).get("completed_count", 0),
            total_points=stats.get(s.id, {}).get("points_total", 0),
            completed_points=stats.get(s.id, {}).get("points_completed", 0),
        )
        for s in sprints
    ]
