from datetime import timedelta
from typing import Any
import requests
import json
import os
import uuid
from pathlib import Path
import shutil
import secrets
import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy import select

from app.auth.dependencies import get_current_user, get_current_admin_user
from app.auth.jwt import create_access_token, create_refresh_token
from app.core.config import settings
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.auth import Token, TokenPayload, UserCreate, UserResponse, PaginatedUsers, GoogleCredential, ProfileUpdate, PasswordChange, UserStats
from app.schemas.common import SuccessResponse
from app.services.user import UserService
from app.db.session import async_session_factory

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate) -> Any:
    """Register a new user and send a verification email."""
    from app.auth.jwt import create_email_verification_token
    from app.services.email_service import send_email
    from app.services.email_templates import build_verification_email

    user_service = UserService()
    existing = await user_service.get_by_email(user_create.email)
    if existing:
      # If already exists but not verified, guide user to verify instead of creating duplicate
      if not existing.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified. Please check your inbox or resend verification.",
        )
      raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail="User with this email already exists",
      )

    # Create user (unverified by default)
    user = await user_service.create(user_create)

    # Generate verification email
    token = create_email_verification_token(user.id, user.email)
    verify_url = f"{settings.BACKEND_URL}/api/auth/verify?token={token}"
    html = build_verification_email(verify_url, user.full_name)
    try:
        send_email(subject="Verify your Thesyx email", recipients=[user.email], html_body=html)
    except Exception as e:
        # Log but do not fail registration in dev
        print("[EMAIL SEND ERROR]", e)

    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """Login with username and password to get access and refresh tokens."""
    user_service = UserService()
    user = await user_service.authenticate(form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified. Please check your inbox or resend verification.",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=access_token_expires,
    )

    refresh_token = create_refresh_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=refresh_token_expires,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(token_payload: TokenPayload) -> Any:
    """Refresh access token using refresh token."""
    # Validate refresh token and create new access token
    try:
        # Implementation would verify the refresh token and generate a new access token
        # For demonstration purposes, we'll just return a new token
        user_service = UserService()
        user = await user_service.get_by_id(token_payload.user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Create new tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id},
            expires_delta=access_token_expires,
        )
        
        refresh_token = create_refresh_token(
            data={"sub": user.email, "user_id": user.id},
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)) -> Any:
    """Logout user."""
    # In a real implementation, you might want to blacklist the token
    # For now, we'll just return a success response
    return {"message": "Successfully logged out"}


@router.get("/users", response_model=PaginatedUsers)
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """Get all users (admin only)."""
    user_service = UserService()
    users, total = await user_service.get_all_users(skip=skip, limit=limit)
    
    return {
        "items": users,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/google", response_model=Token)
async def google_login(google_credential: GoogleCredential) -> Any:
    """Login with Google OAuth."""
    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            google_credential.credential, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=30
        )
        
        # Check if the token is from the correct issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token issuer"
            )
        
        # Extract user information from Google token
        email = idinfo.get('email')
        name = idinfo.get('name', '')
        google_id = idinfo.get('sub')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        user_service = UserService()
        
        # Check if user exists
        user = await user_service.get_by_email(email)
        
        if not user:
            # Create new user if doesn't exist
            user_create = UserCreate(
                email=email,
                full_name=name,
                password=f"google_oauth_{google_id}"  # Placeholder password for OAuth users
            )
            user = await user_service.create(user_create)
            print(f"Created new Google OAuth user: {email}")
        else:
            print(f"Existing user logged in via Google: {email}")
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Create access and refresh tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email, "user_id": user.id}, expires_delta=refresh_token_expires
        )
        

        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
    except ValueError as e:
        # Invalid token - this is the most common error
        print(f"❌ Google token verification failed: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        print(f"❌ Credential length: {len(google_credential.credential) if google_credential.credential else 0}")
        print(f"❌ Client ID used: {settings.GOOGLE_CLIENT_ID[:20] if settings.GOOGLE_CLIENT_ID else 'None'}...")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google credential"
        )
    except Exception as e:
        print(f"❌ Google OAuth unexpected error: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        
        # Provide more specific error messages
        if "column" in str(e).lower() and "does not exist" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database schema needs to be updated. Please run: alembic upgrade head"
            )
        elif "google" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google authentication failed. Please try again."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authentication failed: {str(e)}"
            )


@router.get("/me", response_model=UserResponse)
async def get_current_user_data(current_user: User = Depends(get_current_user)) -> Any:
    """Get current user data."""
    return current_user 


@router.get("/debug/google-config")
async def debug_google_config() -> Any:
    """Debug endpoint to check Google OAuth configuration."""
    return {
        "google_client_id_configured": bool(settings.GOOGLE_CLIENT_ID),
        "google_client_id_preview": settings.GOOGLE_CLIENT_ID[:20] + "..." if settings.GOOGLE_CLIENT_ID else None,
        "google_client_secret_configured": bool(settings.GOOGLE_CLIENT_SECRET),
        "environment": settings.APP_ENV,
        "debug_mode": settings.DEBUG,
        "timestamp": "2024-01-17T10:00:00Z"
    }


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_update: ProfileUpdate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update user profile information."""
    user_service = UserService()
    
    # Check if email is being changed and if it's already taken
    if profile_update.email and profile_update.email != current_user.email:
        existing_user = await user_service.get_by_email(profile_update.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update user profile
    updated_user = await user_service.update_profile(current_user.id, profile_update)
    
    return updated_user


@router.post("/upload-profile-image", response_model=UserResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Upload profile image."""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file size (max 5MB)
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    # Create profile_img directory if it doesn't exist
    profile_img_dir = Path("uploads") / str(current_user.id) / "profile_img"
    profile_img_dir.mkdir(parents=True, exist_ok=True)
    
    # Delete previous images in profile_img directory
    for img_file in profile_img_dir.glob("*"):
        img_file.unlink()
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = profile_img_dir / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file"
        )
    
    # Update user profile with image URL (use relative URL for frontend access)
    relative_url = f"/uploads/{current_user.id}/profile_img/{filename}"
    user_service = UserService()
    profile_update = ProfileUpdate(profile_picture_url=relative_url)
    updated_user = await user_service.update_profile(current_user.id, profile_update)
    
    return updated_user


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user)
) -> Any:
    """Change user password."""
    user_service = UserService()
    
    # Verify current password (synchronous)
    if not user_service.verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    await user_service.update_password(current_user.id, password_change.new_password)
    
    return {"message": "Password updated successfully"}


@router.get("/stats", response_model=UserStats)
async def get_user_stats(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get user statistics."""
    user_service = UserService()
    stats = await user_service.get_user_stats(current_user.id)
    
    return stats


@router.delete("/account", response_model=SuccessResponse)
async def delete_account(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete user account and remove their uploads directory."""
    # Remove uploads/{user_id}
    user_upload_dir = Path(settings.UPLOAD_DIR) / str(current_user.id)
    try:
        if user_upload_dir.exists() and user_upload_dir.is_dir():
            shutil.rmtree(user_upload_dir)
    except Exception as e:
        # Log but continue with account deletion
        print(f"[WARN] Failed to remove uploads directory {user_upload_dir}: {e}")

    user_service = UserService()
    await user_service.delete_user(current_user.id)
    return {"message": "Account deleted successfully"}

@router.post("/increment-tts-minutes", response_model=SuccessResponse)
async def increment_tts_minutes(
    request: dict,
    current_user: User = Depends(get_current_user)
) -> Any:
    """Increment user's TTS minutes consistently (updates monthly and total once)."""
    minutes = int(request.get("minutes", 0))
    if minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minutes must be greater than 0"
        )
    
    # Single source of truth: increment via UsageService (updates monthly + total)
    try:
        from app.services.usage_service import usage_service
        await usage_service.increment(current_user.id, 'tts_minutes', minutes)
    except Exception:
        # best-effort; do not fail if usage store not available
        pass

    return {"message": f"TTS minutes incremented by {minutes}"}


@router.get("/verify")
async def verify_email(token: str) -> Any:
    """Verify email from emailed link and redirect to frontend."""
    from app.auth.jwt import decode_email_verification_token
    from app.services.user import UserService

    try:
        payload = decode_email_verification_token(token)
        user_id = payload.get("user_id")
        email = payload.get("sub")
        user_service = UserService()
        user = await user_service.get_by_id(user_id)
        if not user or user.email != email:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?verify_error=1", status_code=307)
        if not user.is_verified:
            # Mark verified
            async with async_session_factory() as session:
                db_user = await session.get(User, user_id)
                if db_user:
                    db_user.is_verified = True
                    await session.commit()
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?verified=1", status_code=307)
    except (JWTError, Exception):
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?verify_error=1", status_code=307)


@router.post("/resend-verification", response_model=SuccessResponse)
async def resend_verification(current_user: User = Depends(get_current_user)) -> Any:
    """Resend verification email to the authenticated but unverified user."""
    from app.auth.jwt import create_email_verification_token
    from app.services.email_service import send_email
    from app.services.email_templates import build_verification_email

    if current_user.is_verified:
        return {"message": "Email already verified"}

    token = create_email_verification_token(current_user.id, current_user.email)
    verify_url = f"{settings.BACKEND_URL}/api/auth/verify?token={token}"
    html = build_verification_email(verify_url, current_user.full_name)
    send_email(subject="Verify your Thesyx email", recipients=[current_user.email], html_body=html)
    return {"message": "Verification email sent"}

# Public resend endpoint
@router.post("/resend-verification-public", response_model=SuccessResponse)
async def resend_verification_public(payload: dict) -> Any:
    """Resend verification email for a given email address if user exists and is not verified."""
    from app.auth.jwt import create_email_verification_token
    from app.services.email_service import send_email
    from app.services.email_templates import build_verification_email

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

    user_service = UserService()
    user = await user_service.get_by_email(email)
    if not user:
        # Do not leak existence; pretend success
        return {"message": "If an account exists, a verification email has been sent"}

    if user.is_verified:
        return {"message": "Email already verified"}

    token = create_email_verification_token(user.id, user.email)
    verify_url = f"{settings.BACKEND_URL}/api/auth/verify?token={token}"
    html = build_verification_email(verify_url, user.full_name)
    send_email(subject="Verify your Thesyx email", recipients=[user.email], html_body=html)
    return {"message": "Verification email sent"}


@router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(payload: dict) -> Any:
    """Initiate password reset flow; do not reveal whether email exists."""
    from app.services.email_templates import build_password_reset_email
    from app.services.email_service import send_email
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

    user_service = UserService()
    user = await user_service.get_by_email(email)
    if user:
        # Generate token
        raw_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.utcnow() + timedelta(hours=1)
        # Persist token
        async with async_session_factory() as session:
            prt = PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at, used=False)
            session.add(prt)
            await session.commit()
        # Email link with raw token
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
        html = build_password_reset_email(reset_url, user.full_name)
        send_email(subject="Reset your Thesyx password", recipients=[user.email], html_body=html)

    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(payload: dict) -> Any:
    """Complete password reset using token and new password."""
    token = payload.get("token")
    new_password = payload.get("new_password")
    if not token or not new_password or len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    async with async_session_factory() as session:
        # Lookup token
        result = await session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        prt = result.scalars().first()
        if not prt or prt.used or prt.expires_at < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
        # Update password
        user_service = UserService()
        await user_service.update_password(prt.user_id, new_password)
        # Mark token used
        prt.used = True
        await session.commit()

    return {"message": "Password has been reset successfully"}

@router.post("/usage/adjust")
async def adjust_usage(payload: dict, current_user: User = Depends(get_current_user)) -> Any:
    """Adjust monthly usage counters AND user aggregate totals for testing.
    Body: { feature: 'tts_minutes'|'ai_queries'|'book_uploads', delta: int }
    """
    feature = payload.get("feature")
    try:
        delta = int(payload.get("delta", 0))
    except Exception:
        raise HTTPException(status_code=400, detail="Delta must be an integer")

    if feature not in ("tts_minutes", "ai_queries", "book_uploads"):
        raise HTTPException(status_code=400, detail="Invalid feature")

    from sqlalchemy import text
    from app.services.usage_service import _period_bounds

    period_start, period_end = _period_bounds()

    col_map = {
        "tts_minutes": ("tts_minutes_used", "total_tts_minutes"),
        "ai_queries": ("ai_queries_used", "total_ai_queries"),
        "book_uploads": ("book_uploads_used", "total_files_uploaded"),
    }
    period_col, aggregate_col = col_map[feature]

    async with async_session_factory() as session:
        # Best-effort: monthly usage table may not exist in some environments
        try:
            await session.execute(
                text(
                    """
                    INSERT INTO user_usage_periods (user_id, period_start, period_end, tts_minutes_used, ai_queries_used, book_uploads_used)
                    VALUES (:uid, :ps, :pe, 0, 0, 0)
                    ON CONFLICT (user_id, period_start) DO NOTHING
                    """
                ),
                {"uid": current_user.id, "ps": period_start.date(), "pe": period_end.date()},
            )

            await session.execute(
                text(
                    f"""
                    UPDATE user_usage_periods
                    SET {period_col} = CASE WHEN ({period_col} + :delta) < 0 THEN 0 ELSE {period_col} + :delta END
                    WHERE user_id = :uid AND period_start = :ps
                    """
                ),
                {"delta": delta, "uid": current_user.id, "ps": period_start.date()},
            )
        except Exception:
            # Ignore monthly usage update failures
            pass

        # Update user aggregate totals with clamping to >= 0
        await session.execute(
            text(
                f"""
                UPDATE users
                SET {aggregate_col} = CASE WHEN ({aggregate_col} + :delta) < 0 THEN 0 ELSE {aggregate_col} + :delta END
                WHERE id = :uid
                """
            ),
            {"delta": delta, "uid": current_user.id},
        )

        await session.commit()

    # Return updated stats so the client doesn't need another round-trip
    stats = await UserService().get_user_stats(current_user.id)
    return {"message": f"Adjusted {feature} by {delta}", "stats": stats}

@router.post("/usage/adjust-scope")
async def adjust_usage_scope(payload: dict, current_user: User = Depends(get_current_user)) -> Any:
    """Adjust usage for totals or monthly scope.
    Body: { feature: 'tts_minutes'|'ai_queries'|'book_uploads', delta: int, scope: 'total'|'monthly' }
    """
    feature = payload.get("feature")
    scope = (payload.get("scope") or "").lower()
    try:
        delta = int(payload.get("delta", 0))
    except Exception:
        raise HTTPException(status_code=400, detail="Delta must be an integer")
    if feature not in ("tts_minutes", "ai_queries", "book_uploads"):
        raise HTTPException(status_code=400, detail="Invalid feature")
    if scope not in ("total", "monthly"):
        raise HTTPException(status_code=400, detail="Invalid scope")

    from sqlalchemy import text
    from app.services.usage_service import _period_bounds

    async with async_session_factory() as session:
        if scope == 'monthly':
            # Ensure monthly row
            start, end = _period_bounds()
            await session.execute(
                text(
                    """
                    INSERT INTO user_usage_periods (user_id, period_start, period_end, tts_minutes_used, ai_queries_used, book_uploads_used)
                    VALUES (:uid, :ps, :pe, 0, 0, 0)
                    ON CONFLICT (user_id, period_start) DO NOTHING
                    """
                ),
                {"uid": current_user.id, "ps": start.date(), "pe": end.date()},
            )
            col = {
                "tts_minutes": "tts_minutes_used",
                "ai_queries": "ai_queries_used",
                "book_uploads": "book_uploads_used",
            }[feature]
            await session.execute(
                text(
                    f"""
                    UPDATE user_usage_periods
                    SET {col} = CASE WHEN ({col} + :delta) < 0 THEN 0 ELSE {col} + :delta END
                    WHERE user_id = :uid AND period_start = :ps
                    """
                ),
                {"delta": delta, "uid": current_user.id, "ps": start.date()},
            )
        else:
            # Totals on users table
            agg_col = {
                "tts_minutes": "total_tts_minutes",
                "ai_queries": "total_ai_queries",
                "book_uploads": "total_files_uploaded",
            }[feature]
            await session.execute(
                text(
                    f"""
                    UPDATE users
                    SET {agg_col} = CASE WHEN ({agg_col} + :delta) < 0 THEN 0 ELSE {agg_col} + :delta END
                    WHERE id = :uid
                    """
                ),
                {"delta": delta, "uid": current_user.id},
            )
        await session.commit()

    stats = await UserService().get_user_stats(current_user.id)
    return {"message": f"Adjusted {feature} {scope} by {delta}", "stats": stats}