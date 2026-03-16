from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import decode_token
from app.database import get_db
from app.models import User, WorkspaceMember

security = HTTPBearer()

ROLE_HIERARCHY = {"owner": 0, "admin": 1, "member": 2, "guest": 3}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_workspace_member(
    workspace_id: int,
    user_id: int,
    db: Session,
    min_role: str = "guest",
) -> WorkspaceMember:
    member = (
        db.query(WorkspaceMember)
        .filter_by(workspace_id=workspace_id, user_id=user_id)
        .first()
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a workspace member")
    if ROLE_HIERARCHY.get(member.role, 99) > ROLE_HIERARCHY.get(min_role, 99):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    return member
