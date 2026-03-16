from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import Project, User, Workspace, WorkItem
from app.schemas import SearchResultResponse

router = APIRouter(tags=["search"])


@router.get(
    "/workspaces/{ws_slug}/projects/{project_slug}/search",
    response_model=list[SearchResultResponse],
)
def search_items(
    ws_slug: str,
    project_slug: str,
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)
    project = db.query(Project).filter_by(workspace_id=ws.id, slug=project_slug).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    results = db.execute(
        text(
            "SELECT id, ts_rank(search_vector, plainto_tsquery('english', :q)) AS rank, "
            "ts_headline('english', title, plainto_tsquery('english', :q), "
            "'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10') AS headline "
            "FROM work_items "
            "WHERE project_id = :pid AND search_vector @@ plainto_tsquery('english', :q) "
            "ORDER BY rank DESC LIMIT :lim"
        ),
        {"q": q, "pid": project.id, "lim": limit},
    ).fetchall()

    items = []
    for row in results:
        item = db.get(WorkItem, row.id)
        if item:
            items.append({
                "item": item,
                "headline": row.headline,
                "rank": float(row.rank),
            })
    return items
