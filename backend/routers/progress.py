
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import jwt
import os

from ..database.connection import SessionLocal
from ..models.progress import UserProgress
from ..models.user import User

router = APIRouter(prefix="/progress", tags=["User Progress"])

bearer_scheme = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_logged_in_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not SECRET_KEY:
        raise HTTPException(status_code=500, detail="JWT secret is not configured")

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


class ProgressCreate(BaseModel):
    feature: str = Field(min_length=1, max_length=50)
    activity_type: str = Field(min_length=1, max_length=100)
    details: dict | None = None


@router.post("")
def save_progress(
    payload: ProgressCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_logged_in_user),
):
    record = UserProgress(
        user_id=user.id,
        feature=payload.feature,
        activity_type=payload.activity_type,
        details=payload.details,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Progress saved",
        "id": record.id,
        "feature": record.feature,
        "activity_type": record.activity_type,
        "details": record.details,
        "created_at": record.created_at,
    }


@router.get("")
def get_my_progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_logged_in_user),
):
    records = (
        db.query(UserProgress)
        .filter(UserProgress.user_id == user.id)
        .order_by(UserProgress.created_at.desc())
        .all()
    )

    return [
        {
            "id": record.id,
            "feature": record.feature,
            "activity_type": record.activity_type,
            "details": record.details,
            "created_at": record.created_at,
        }
        for record in records
    ]
