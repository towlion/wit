import re

from sqlalchemy.orm import Session

from app.models import User, WorkspaceMember


def extract_mentions(text: str) -> list[str]:
    """Extract @display_name mentions from text."""
    return re.findall(r"@([\w ]+?)(?=\s@|\s[^@]|$|[.,;:!?\)])", text)


def resolve_mentioned_users(
    db: Session, names: list[str], workspace_id: int
) -> list[User]:
    """Resolve display names to User objects within a workspace."""
    if not names:
        return []
    member_user_ids = (
        db.query(WorkspaceMember.user_id)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .subquery()
    )
    return (
        db.query(User)
        .filter(
            User.id.in_(member_user_ids),
            User.display_name.in_(names),
        )
        .all()
    )
