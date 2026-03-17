import csv
import io
import statistics
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import (
    ActivityEvent,
    Project,
    Subtask,
    User,
    WorkflowState,
    WorkItem,
    WorkItemAssignee,
    Workspace,
    WorkspaceMember,
)
from app.schemas import (
    ActiveMemberSummary,
    ActivityTrendPoint,
    BurndownPoint,
    CycleTimeStats,
    MemberBreakdown,
    PriorityDistributionItem,
    ProjectInsightsResponse,
    ProjectSummary,
    RecentlyCompletedItem,
    StatusDistributionItem,
    WorkspaceInsightsResponse,
)

router = APIRouter(tags=["insights"])


def _resolve_project(ws_slug: str, project_slug: str, user: User, db: Session, min_role: str = "member") -> tuple[Workspace, Project]:
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role=min_role)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ws, project


def _sanitize_csv_cell(value: str) -> str:
    if value and value[0] in ("=", "+", "-", "@"):
        return "\t" + value
    return value


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/insights",
    response_model=ProjectInsightsResponse,
)
def project_insights(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get project analytics: status/priority distribution, burndown, cycle time, member breakdown."""
    _, project = _resolve_project(ws_slug, project_slug, user, db)

    # Status distribution
    status_rows = (
        db.query(
            WorkflowState.id,
            WorkflowState.name,
            WorkflowState.category,
            WorkflowState.color,
            func.count(WorkItem.id),
        )
        .outerjoin(WorkItem, (WorkItem.status_id == WorkflowState.id) & (WorkItem.archived == False))
        .filter(WorkflowState.project_id == project.id)
        .group_by(WorkflowState.id)
        .order_by(WorkflowState.position)
        .all()
    )
    status_distribution = [
        StatusDistributionItem(state_id=r[0], state_name=r[1], category=r[2], color=r[3], count=r[4])
        for r in status_rows
    ]

    # Priority distribution
    priority_rows = (
        db.query(WorkItem.priority, func.count(WorkItem.id))
        .filter(WorkItem.project_id == project.id, WorkItem.archived == False)
        .group_by(WorkItem.priority)
        .all()
    )
    priority_distribution = [
        PriorityDistributionItem(priority=r[0], count=r[1]) for r in priority_rows
    ]

    # Burndown (last 30 days)
    states = db.query(WorkflowState).filter_by(project_id=project.id).all()
    active_categories = {"todo", "in_progress"}
    active_state_ids = {s.id for s in states if s.category in active_categories}
    state_name_to_category = {}
    for s in states:
        state_name_to_category[s.name] = s.category

    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    current_remaining = (
        db.query(func.count(WorkItem.id))
        .filter(
            WorkItem.project_id == project.id,
            WorkItem.archived == False,
            WorkItem.status_id.in_(active_state_ids) if active_state_ids else False,
        )
        .scalar()
        or 0
    )

    # Get status_change events in the last 30 days, ordered newest first
    status_events = (
        db.query(ActivityEvent)
        .join(WorkItem, ActivityEvent.work_item_id == WorkItem.id)
        .filter(
            WorkItem.project_id == project.id,
            ActivityEvent.event_type == "status_change",
            ActivityEvent.created_at >= datetime(thirty_days_ago.year, thirty_days_ago.month, thirty_days_ago.day, tzinfo=timezone.utc),
        )
        .order_by(ActivityEvent.created_at.desc())
        .all()
    )

    # Walk backwards from today, adjusting remaining count
    burndown = []
    remaining = current_remaining
    event_idx = 0

    for day_offset in range(31):
        d = today - timedelta(days=day_offset)
        # Process events that happened on this day (reverse their effect)
        while event_idx < len(status_events):
            ev_date = status_events[event_idx].created_at.date()
            if ev_date < d:
                break
            if ev_date == d:
                old_cat = state_name_to_category.get(status_events[event_idx].old_value)
                new_cat = state_name_to_category.get(status_events[event_idx].new_value)
                if old_cat in active_categories and new_cat not in active_categories:
                    remaining += 1
                elif old_cat not in active_categories and new_cat in active_categories:
                    remaining -= 1
            event_idx += 1
        burndown.append(BurndownPoint(date=d, remaining=max(remaining, 0)))

    burndown.reverse()

    # Cycle time
    done_state_ids = {s.id for s in states if s.category == "done"}
    done_items = (
        db.query(WorkItem)
        .filter(
            WorkItem.project_id == project.id,
            WorkItem.archived == False,
            WorkItem.status_id.in_(done_state_ids) if done_state_ids else False,
        )
        .all()
    )

    in_progress_names = {s.name for s in states if s.category == "in_progress"}
    done_names = {s.name for s in states if s.category == "done"}
    cycle_days = []

    for item in done_items:
        events = (
            db.query(ActivityEvent)
            .filter(
                ActivityEvent.work_item_id == item.id,
                ActivityEvent.event_type == "status_change",
            )
            .order_by(ActivityEvent.created_at)
            .all()
        )
        first_in_progress = None
        last_done = None
        for ev in events:
            if ev.new_value in in_progress_names and first_in_progress is None:
                first_in_progress = ev.created_at
            if ev.new_value in done_names:
                last_done = ev.created_at
        if first_in_progress and last_done and last_done > first_in_progress:
            cycle_days.append((last_done - first_in_progress).total_seconds() / 86400)

    cycle_time = CycleTimeStats(
        avg_days=round(sum(cycle_days) / len(cycle_days), 1) if cycle_days else None,
        median_days=round(statistics.median(cycle_days), 1) if cycle_days else None,
        count=len(cycle_days),
    )

    # Member breakdown
    created_counts = dict(
        db.query(WorkItem.created_by_id, func.count(WorkItem.id))
        .filter(WorkItem.project_id == project.id, WorkItem.archived == False)
        .group_by(WorkItem.created_by_id)
        .all()
    )
    completed_counts: dict[int, int] = defaultdict(int)
    if done_state_ids:
        completed_events = (
            db.query(ActivityEvent.user_id, func.count(ActivityEvent.id))
            .join(WorkItem, ActivityEvent.work_item_id == WorkItem.id)
            .filter(
                WorkItem.project_id == project.id,
                ActivityEvent.event_type == "status_change",
                ActivityEvent.new_value.in_(done_names),
            )
            .group_by(ActivityEvent.user_id)
            .all()
        )
        for uid, cnt in completed_events:
            if uid:
                completed_counts[uid] = cnt

    assigned_counts = dict(
        db.query(WorkItemAssignee.user_id, func.count(WorkItemAssignee.work_item_id))
        .join(WorkItem, WorkItemAssignee.work_item_id == WorkItem.id)
        .filter(WorkItem.project_id == project.id, WorkItem.archived == False)
        .group_by(WorkItemAssignee.user_id)
        .all()
    )

    all_user_ids = set(created_counts.keys()) | set(completed_counts.keys()) | set(assigned_counts.keys())
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(all_user_ids)).all()} if all_user_ids else {}

    member_breakdown = [
        MemberBreakdown(
            user_id=uid,
            display_name=users_map[uid].display_name if uid in users_map else "Unknown",
            items_created=created_counts.get(uid, 0),
            items_completed=completed_counts.get(uid, 0),
            items_assigned=assigned_counts.get(uid, 0),
        )
        for uid in sorted(all_user_ids)
        if uid in users_map
    ]

    # Recently completed
    recently_completed = []
    if done_state_ids:
        done_items_recent = (
            db.query(WorkItem)
            .filter(
                WorkItem.project_id == project.id,
                WorkItem.archived == False,
                WorkItem.status_id.in_(done_state_ids),
            )
            .order_by(WorkItem.id.desc())
            .limit(10)
            .all()
        )
        for item in done_items_recent:
            last_done_event = (
                db.query(ActivityEvent)
                .filter(
                    ActivityEvent.work_item_id == item.id,
                    ActivityEvent.event_type == "status_change",
                    ActivityEvent.new_value.in_(done_names),
                )
                .order_by(ActivityEvent.created_at.desc())
                .first()
            )
            completed_by = None
            completed_at = item.created_at
            if last_done_event:
                completed_at = last_done_event.created_at
                if last_done_event.user_id and last_done_event.user_id in users_map:
                    completed_by = users_map[last_done_event.user_id].display_name
                elif last_done_event.user_id:
                    u = db.get(User, last_done_event.user_id)
                    completed_by = u.display_name if u else None
            recently_completed.append(
                RecentlyCompletedItem(
                    item_number=item.item_number,
                    title=item.title,
                    completed_at=completed_at,
                    completed_by=completed_by,
                )
            )

    return ProjectInsightsResponse(
        status_distribution=status_distribution,
        priority_distribution=priority_distribution,
        burndown=burndown,
        cycle_time=cycle_time,
        member_breakdown=member_breakdown,
        recently_completed=recently_completed,
    )


@router.get("/workspaces/{ws_slug}/projects/{project_slug}/export.csv")
def export_csv(
    ws_slug: str,
    project_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export project work items as a CSV file."""
    _, project = _resolve_project(ws_slug, project_slug, user, db)

    items = (
        db.query(WorkItem)
        .filter(WorkItem.project_id == project.id, WorkItem.archived == False)
        .order_by(WorkItem.item_number)
        .all()
    )

    states_map = {s.id: s.name for s in db.query(WorkflowState).filter_by(project_id=project.id).all()}
    users_map = {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["item_number", "title", "description", "status", "priority", "due_date", "created_by", "created_at", "assignees", "labels", "subtask_total", "subtask_completed"])

    for item in items:
        if item.created_by_id not in users_map:
            u = db.get(User, item.created_by_id)
            users_map[item.created_by_id] = u.display_name if u else "Unknown"

        assignee_names = ", ".join(a.display_name for a in item.assignees)
        label_names = ", ".join(lb.name for lb in item.labels)

        subtasks = db.query(Subtask).filter_by(work_item_id=item.id).all()
        subtask_total = len(subtasks)
        subtask_completed = sum(1 for s in subtasks if s.completed)

        row = [
            str(item.item_number),
            _sanitize_csv_cell(item.title),
            _sanitize_csv_cell(item.description or ""),
            states_map.get(item.status_id, ""),
            item.priority,
            str(item.due_date) if item.due_date else "",
            users_map[item.created_by_id],
            item.created_at.isoformat(),
            assignee_names,
            label_names,
            str(subtask_total),
            str(subtask_completed),
        ]
        writer.writerow(row)

    output.seek(0)
    filename = f"{project_slug}-items.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get(
    "/workspaces/{ws_slug}/insights",
    response_model=WorkspaceInsightsResponse,
)
def workspace_insights(
    ws_slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get workspace-level analytics: project summaries, active members, activity trend.

    Requires admin role.
    """
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db, min_role="admin")

    # Project summaries
    projects = db.query(Project).filter_by(workspace_id=ws.id).all()
    project_summaries = []
    for p in projects:
        total = (
            db.query(func.count(WorkItem.id))
            .filter(WorkItem.project_id == p.id, WorkItem.archived == False)
            .scalar()
            or 0
        )
        done_state_ids = [
            s.id for s in db.query(WorkflowState).filter_by(project_id=p.id, category="done").all()
        ]
        completed = 0
        if done_state_ids:
            completed = (
                db.query(func.count(WorkItem.id))
                .filter(
                    WorkItem.project_id == p.id,
                    WorkItem.archived == False,
                    WorkItem.status_id.in_(done_state_ids),
                )
                .scalar()
                or 0
            )
        rate = (completed / total * 100) if total > 0 else 0.0
        project_summaries.append(
            ProjectSummary(
                project_id=p.id,
                project_name=p.name,
                project_slug=p.slug,
                total_items=total,
                completed_items=completed,
                completion_rate=round(rate, 1),
            )
        )

    # Most active members (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    project_ids = [p.id for p in projects]
    active_members = []
    if project_ids:
        rows = (
            db.query(ActivityEvent.user_id, func.count(ActivityEvent.id))
            .join(WorkItem, ActivityEvent.work_item_id == WorkItem.id)
            .filter(
                WorkItem.project_id.in_(project_ids),
                ActivityEvent.created_at >= thirty_days_ago,
                ActivityEvent.user_id.isnot(None),
            )
            .group_by(ActivityEvent.user_id)
            .order_by(func.count(ActivityEvent.id).desc())
            .limit(10)
            .all()
        )
        user_ids = [r[0] for r in rows]
        users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
        active_members = [
            ActiveMemberSummary(
                user_id=r[0],
                display_name=users_map[r[0]].display_name if r[0] in users_map else "Unknown",
                events_count=r[1],
            )
            for r in rows
            if r[0] in users_map
        ]

    # Activity trend (last 30 days)
    activity_trend = []
    if project_ids:
        trend_rows = (
            db.query(
                func.date_trunc("day", ActivityEvent.created_at).label("d"),
                func.count(ActivityEvent.id),
            )
            .join(WorkItem, ActivityEvent.work_item_id == WorkItem.id)
            .filter(
                WorkItem.project_id.in_(project_ids),
                ActivityEvent.created_at >= thirty_days_ago,
            )
            .group_by("d")
            .order_by("d")
            .all()
        )
        trend_map = {r[0].date(): r[1] for r in trend_rows}
        today = date.today()
        for day_offset in range(30, -1, -1):
            d = today - timedelta(days=day_offset)
            activity_trend.append(
                ActivityTrendPoint(date=d, count=trend_map.get(d, 0))
            )
    else:
        today = date.today()
        for day_offset in range(30, -1, -1):
            d = today - timedelta(days=day_offset)
            activity_trend.append(ActivityTrendPoint(date=d, count=0))

    return WorkspaceInsightsResponse(
        project_summaries=project_summaries,
        most_active_members=active_members,
        activity_trend=activity_trend,
    )
