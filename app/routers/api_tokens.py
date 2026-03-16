from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import generate_api_token
from app.database import get_db
from app.deps import get_current_user
from app.models import ApiToken, User
from app.schemas import ApiTokenCreate, ApiTokenCreateResponse, ApiTokenResponse

router = APIRouter(tags=["api-tokens"])


@router.post("/profile/tokens", response_model=ApiTokenCreateResponse, status_code=201)
def create_token(
    body: ApiTokenCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw, token_hash = generate_api_token()
    expires_at = None
    if body.expires_in_days is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)

    api_token = ApiToken(
        user_id=user.id,
        name=body.name,
        token_hash=token_hash,
        token_prefix=raw[:12],
        expires_at=expires_at,
    )
    db.add(api_token)
    db.commit()
    db.refresh(api_token)

    return ApiTokenCreateResponse(
        id=api_token.id,
        name=api_token.name,
        token=raw,
        token_prefix=api_token.token_prefix,
        expires_at=api_token.expires_at,
        created_at=api_token.created_at,
    )


@router.get("/profile/tokens", response_model=list[ApiTokenResponse])
def list_tokens(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tokens = (
        db.query(ApiToken)
        .filter_by(user_id=user.id)
        .order_by(ApiToken.created_at.desc())
        .all()
    )
    return tokens


@router.delete("/profile/tokens/{token_id}", status_code=204)
def revoke_token(
    token_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    api_token = db.query(ApiToken).filter_by(id=token_id, user_id=user.id).first()
    if api_token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    db.delete(api_token)
    db.commit()
