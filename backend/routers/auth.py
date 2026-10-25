
import os
import hashlib
import secrets
import logging

from datetime import datetime, timedelta, timezone

import jwt
import resend
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database.connection import SessionLocal
from ..models.email_verification import EmailVerification
from ..models.password_reset import PasswordReset
from ..models.user import User

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
MAX_OTP_ATTEMPTS = 1
PASSWORD_RESET_EXPIRE_MINUTES = 10
MAX_PASSWORD_RESET_ATTEMPTS = 5
PASSWORD_RESET_COOLDOWN_SECONDS = 60


# -------------------------
# Request models
# -------------------------

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")


class ResendOTPRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RequestPasswordReset(BaseModel):
    email: EmailStr


class ConfirmPasswordReset(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)


# -------------------------
# Database dependency
# -------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -------------------------
# OTP helpers
# -------------------------

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def send_transactional_email(
    recipient_email: str,
    subject: str,
    text_body: str,
):
    """Send an email through Resend's HTTPS API (no SMTP connection required)."""
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("MAIL_FROM")

    if not api_key or not sender:
        logger.error("Email service configuration is missing (RESEND_API_KEY or MAIL_FROM).")
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Please contact support.",
        )

    try:
        resend.api_key = api_key
        result = resend.Emails.send({
            "from": sender,
            "to": [recipient_email],
            "subject": subject,
            "text": text_body,
        })
        logger.info("Email provider accepted a message for delivery.")
        return result

    except HTTPException:
        raise
    except Exception as error:
        # Keep provider details in server logs; never return secrets or raw provider
        # errors to the client. Resend acceptance does not guarantee inbox delivery.
        logger.exception("Resend email request failed (%s).", type(error).__name__)
        raise HTTPException(
            status_code=502,
            detail="Could not send the email. Please try again later.",
        ) from error


def send_otp_email(recipient_email: str, otp: str):
    send_transactional_email(
        recipient_email=recipient_email,
        subject="Verify your HireMate AI account",
        text_body=(
            "Hello,\n\n"
            f"Your HireMate AI verification code is: {otp}\n\n"
            f"This code expires in {OTP_EXPIRE_MINUTES} minutes.\n"
            "Enter it in HireMate AI to verify your email address.\n\n"
            "If you did not request this code, you can ignore this email.\n\n"
            "HireMate AI Team"
        ),
    )


def send_password_reset_email(recipient_email: str, otp: str):
    send_transactional_email(
        recipient_email=recipient_email,
        subject="Reset your HireMate AI password",
        text_body=(
            "Hello,\n\n"
            f"Your HireMate AI password reset code is: {otp}\n\n"
            f"This code expires in {PASSWORD_RESET_EXPIRE_MINUTES} minutes.\n"
            "Enter it in HireMate AI to reset your password.\n\n"
            "If you did not request a password reset, you can ignore this email.\n\n"
            "HireMate AI Team"
        ),
    )


# -------------------------
# JWT token creation
# -------------------------

def create_access_token(user_id: int):
    if not SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET_KEY is missing from backend/.env"
        )

    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# -------------------------
# Health check
# -------------------------

@router.get("/health")
def auth_health():
    return {"message": "Authentication API is ready"}


# -------------------------
# Register and send OTP
# -------------------------

@router.post("/register", status_code=201)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db)
):
    email = str(payload.email).strip().lower()
    full_name = payload.full_name.strip()

    if len(full_name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Please enter your full name."
        )

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists."
        )

    pending = db.query(EmailVerification).filter(
        EmailVerification.email == email
    ).first()

    # Generate a new one-time code for this registration.
    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if pending:
        # Avoid allowing unlimited OTP requests.
        if pending.created_at:
            created_at = pending.created_at
            if created_at.tzinfo is not None:
                created_at = created_at.replace(tzinfo=None)

            if (now - created_at).total_seconds() < 60:
                raise HTTPException(
                    status_code=429,
                    detail="Please wait 60 seconds before requesting another OTP."
                )

        pending.full_name = full_name
        pending.hashed_password = password_hash.hash(payload.password)
        pending.otp_hash = hash_otp(otp)
        pending.expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
        pending.attempts = 0
        pending.created_at = now

    else:
        pending = EmailVerification(
            full_name=full_name,
            email=email,
            hashed_password=password_hash.hash(payload.password),
            otp_hash=hash_otp(otp),
            expires_at=now + timedelta(minutes=OTP_EXPIRE_MINUTES),
            attempts=0,
            created_at=now
        )
        db.add(pending)

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save registration. Check the database configuration."
        )

    # Send only after the pending registration has been saved.
    try:
        send_otp_email(email, otp)
    except HTTPException:
        raise

    return {
        "message": f"Verification code sent to {email}. It expires in {OTP_EXPIRE_MINUTES} minutes.",
        "email": email
    }


# -------------------------
# Verify email and create account
# -------------------------


@router.post("/resend-otp")
def resend_otp(
    payload: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    email = str(payload.email).strip().lower()

    pending = (
        db.query(EmailVerification)
        .filter(EmailVerification.email == email)
        .first()
    )

    if not pending:
        raise HTTPException(
            status_code=404,
            detail="No pending registration found. Please register again."
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Allow only one resend every 60 seconds.
    if pending.created_at:
        created_at = pending.created_at

        if created_at.tzinfo is not None:
            created_at = created_at.replace(tzinfo=None)

        seconds_elapsed = (now - created_at).total_seconds()

        if seconds_elapsed < 60:
            wait_seconds = max(1, 60 - int(seconds_elapsed))

            raise HTTPException(
                status_code=429,
                detail=(
                    f"Please wait {wait_seconds} seconds "
                    "before requesting another OTP."
                )
            )

    # Generate a new six-digit OTP.
    otp = f"{secrets.randbelow(900000) + 100000:06d}"

    # Save the new OTP hash and exact one-minute expiry.
    pending.otp_hash = hash_otp(otp)
    pending.expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
    pending.attempts = 0
    pending.created_at = now

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the new OTP."
        )

    # Send the OTP to the user's email.
    send_otp_email(email, otp)

    return {
        "message": (
            f"A new verification code has been sent to {email}. "
            "It expires in 1 minute."
        )
    }


@router.post("/password-reset/request")
def request_password_reset(
    payload: RequestPasswordReset,
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()
    generic_message = (
        "If an eligible account exists for this email, a password reset code "
        "will be sent."
    )
    user = (
        db.query(User)
        .filter(User.email == email, User.is_verified.is_(True))
        .first()
    )

    if not user:
        return {"message": generic_message}

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    reset = db.query(PasswordReset).filter(PasswordReset.email == email).first()

    if reset:
        created_at = reset.created_at
        if created_at.tzinfo is not None:
            created_at = created_at.replace(tzinfo=None)
        seconds_elapsed = (now - created_at).total_seconds()
        if seconds_elapsed < PASSWORD_RESET_COOLDOWN_SECONDS:
            return {"message": generic_message}

    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    if reset:
        reset.otp_hash = hash_otp(otp)
        reset.expires_at = now + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
        reset.attempts = 0
        reset.created_at = now
    else:
        reset = PasswordReset(
            email=email,
            otp_hash=hash_otp(otp),
            expires_at=now + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES),
            attempts=0,
            created_at=now,
        )
        db.add(reset)

    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the password reset request. Please try again.",
        ) from error

    send_password_reset_email(email, otp)
    return {"message": generic_message}


@router.post("/password-reset/confirm")
def confirm_password_reset(
    payload: ConfirmPasswordReset,
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    reset = (
        db.query(PasswordReset)
        .filter(PasswordReset.email == email)
        .with_for_update()
        .first()
    )

    if not reset:
        raise HTTPException(
            status_code=400,
            detail="The password reset code is invalid or expired. Request a new code.",
        )

    expires_at = reset.expires_at
    if expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)
    if now >= expires_at:
        db.delete(reset)
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not clear the expired password reset code.",
            ) from error
        raise HTTPException(
            status_code=400,
            detail="The password reset code is invalid or expired. Request a new code.",
        )

    if reset.attempts >= MAX_PASSWORD_RESET_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Request a new password reset code.",
        )

    if not secrets.compare_digest(reset.otp_hash, hash_otp(payload.otp)):
        reset.attempts += 1
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not record the password reset attempt.",
            ) from error
        raise HTTPException(
            status_code=400,
            detail="The password reset code is invalid or expired. Request a new code.",
        )

    user = db.query(User).filter(
        User.email == email,
        User.is_verified.is_(True),
    ).first()
    if not user:
        db.delete(reset)
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not complete the password reset.",
            ) from error
        raise HTTPException(
            status_code=400,
            detail="The password reset code is invalid or expired. Request a new code.",
        )

    user.hashed_password = password_hash.hash(payload.new_password)
    db.delete(reset)
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update the password. Please try again.",
        ) from error

    return {"message": "Your password has been reset. You can now log in."}


@router.post("/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    email = str(payload.email).strip().lower()
    otp = payload.otp.strip()

    pending = (
        db.query(EmailVerification)
        .filter(EmailVerification.email == email)
        .with_for_update()
        .first()
    )

    if not pending:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user and existing_user.is_verified:
            return {
                "message": "Email is already verified. You can now log in."
            }

        raise HTTPException(
            status_code=404,
            detail="No pending registration found. Please register again."
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    expires_at = pending.expires_at
    if expires_at and expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)

    if not expires_at or now >= expires_at:
        db.delete(pending)
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not clear the expired verification code.",
            ) from error
        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please register again to get a new code."
        )

    if pending.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Please request a new OTP."
        )

    if not secrets.compare_digest(pending.otp_hash, hash_otp(otp)):
        pending.attempts += 1
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not record the verification attempt.",
            ) from error
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP. Please enter the latest verification code."
        )

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        if not existing_user.is_verified:
            raise HTTPException(
                status_code=409,
                detail="An unverified account already exists for this email.",
            )
        db.delete(pending)
    else:
        db.add(
            User(
                full_name=pending.full_name,
                email=email,
                hashed_password=pending.hashed_password,
                phone=None,
                is_verified=True,
            )
        )
        db.delete(pending)

    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not complete email verification. Please retry.",
        ) from error

    return {
        "message": "Email verified successfully. You can now log in."
    }




# -------------------------
# Login with email/password
# -------------------------

@router.post("/login")
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    email = str(payload.email).strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if (
        not user
        or not user.hashed_password
        or not password_hash.verify(
            payload.password,
            user.hashed_password
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password."
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in."
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone
        }
    }


# -------------------------
# Get current logged-in user
# -------------------------

@router.get("/me")
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    if not SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET_KEY is missing from backend/.env"
        )

    token = credentials.credentials

    try:
        token_payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id = int(token_payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before accessing your account."
        )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone
    }
