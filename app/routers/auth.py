from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_token, hash_password, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models import User, Workspace, WorkspaceMember
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user.

    Creates a new account and a default workspace. Returns a JWT access token.

    - **409**: Email already registered
    """
    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=body.email,
        display_name=body.display_name,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.flush()

    # Create default workspace
    slug = body.email.split("@")[0].lower().replace(".", "-")
    workspace = Workspace(name=f"{body.display_name}'s Workspace", slug=slug)
    db.add(workspace)
    db.flush()

    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
    db.commit()

    return TokenResponse(access_token=create_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Log in with email and password.

    Returns a JWT access token.

    - **401**: Invalid credentials
    """
    user = db.query(User).filter_by(email=body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_token(user.id))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    """Get the current authenticated user."""
    return user
