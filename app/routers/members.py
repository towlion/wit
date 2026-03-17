from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_workspace_member
from app.models import User, Workspace, WorkspaceMember
from app.schemas import UserResponse

router = APIRouter(tags=["members"])


@router.get(
    "/workspaces/{ws_slug}/members/search",
    response_model=list[UserResponse],
)
def search_members(
    ws_slug: str,
    q: str = Query("", min_length=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = db.query(Workspace).filter_by(slug=ws_slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    get_workspace_member(ws.id, user.id, db)

    query = (
        db.query(User)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == ws.id)
    )
    if q:
        query = query.filter(User.display_name.ilike(f"{q}%"))
    return query.limit(10).all()
