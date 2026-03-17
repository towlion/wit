from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import hash_password, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import PasswordChange, ProfileUpdate, UserResponse

router = APIRouter(prefix="/profile", tags=["profile"])


@router.patch("", response_model=UserResponse)
def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile.

    Supports partial updates — only provided fields are changed.

    - **400**: Invalid theme or digest mode value
    """
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.theme is not None:
        if body.theme not in ("dark", "light", "system"):
            raise HTTPException(status_code=400, detail="Invalid theme value")
        user.theme = body.theme if body.theme != "system" else None
    if body.email_notifications is not None:
        user.email_notifications = body.email_notifications
    if body.email_digest_mode is not None:
        if body.email_digest_mode not in ("immediate", "daily"):
            raise HTTPException(status_code=400, detail="Invalid digest mode")
        user.email_digest_mode = body.email_digest_mode
    db.commit()
    db.refresh(user)
    return user


@router.put("/password")
def change_password(
    body: PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password.

    - **400**: Current password incorrect or new password too short
    """
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated"}
