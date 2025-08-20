from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from sqlalchemy import delete

from app.auth.dependencies import get_current_admin_user
from app.db.session import get_db, async_session_factory
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.services.user import UserService
from app.services.usage_service import usage_service

router = APIRouter()

class AdminCreateUser(BaseModel):
    email: EmailStr
    full_name: str
    password: Optional[str] = None
    is_verified: bool = True
    subscription_tier: Optional[str] = None
    subscription_status: Optional[str] = None

class AdminUpdatePlan(BaseModel):
    subscription_tier: str
    subscription_status: str
    subscription_renewal_at: Optional[datetime] = None

async def _enrich_user(u: User) -> Dict[str, Any]:
    usage = await usage_service.get_usage(u.id)
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "is_active": u.is_active,
        "is_admin": u.is_admin,
        "is_verified": u.is_verified,
        "subscription_status": u.subscription_status,
        "subscription_tier": u.subscription_tier,
        "stripe_customer_id": u.stripe_customer_id,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
        "last_login_at": u.last_login_at,
        # Totals
        "total_files_uploaded": u.total_files_uploaded or 0,
        "total_tts_minutes": u.total_tts_minutes or 0,
        "total_ai_queries": u.total_ai_queries or 0,
        # Monthly usage
        "monthly_tts_minutes_used": usage.get("tts_minutes_used", 0),
        "monthly_ai_queries_used": usage.get("ai_queries_used", 0),
        "monthly_book_uploads_used": usage.get("book_uploads_used", 0),
    }

@router.get("/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    try:
        user_service = UserService(db)
        users, total = await user_service.get_all_users(skip=skip, limit=limit)

        # Build enriched records with subscription info and usage stats
        enriched: List[Dict[str, Any]] = []
        for u in users:
            enriched.append(await _enrich_user(u))

        return {
            "items": enriched,
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    except Exception as e:
        print(f"[ADMIN] list_users failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@router.post("/users")
async def create_user(
    payload: AdminCreateUser,
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    # Check for duplicate email
    user_service = UserService()
    existing = await user_service.get_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Create user with provided or generated password
    password = payload.password or ("Temp" + datetime.utcnow().strftime("%Y%m%d%H%M%S"))
    hashed = user_service.get_password_hash(password)

    async with async_session_factory() as session:
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hashed,
            is_active=True,
            is_admin=False,
            is_verified=payload.is_verified,
            subscription_tier=(payload.subscription_tier or None),
            subscription_status=(payload.subscription_status or None),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        enriched = await _enrich_user(user)
        # For admin convenience, include the temp password only if auto-generated
        if payload.password is None:
            enriched["temporary_password"] = password
        return enriched

@router.post("/users/{user_id}/plan")
async def update_user_plan(
    user_id: int,
    payload: AdminUpdatePlan,
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    async with async_session_factory() as session:
        db_user = await session.get(User, user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        db_user.subscription_tier = payload.subscription_tier
        db_user.subscription_status = payload.subscription_status
        db_user.subscription_renewal_at = payload.subscription_renewal_at
        await session.commit()
        # return enriched
        return await _enrich_user(db_user)

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Admins cannot delete their own account")
    from app.services.file_manager import FileManager
    fm = FileManager()
    try:
        # Delete user in DB (cascade removes books)
        async with async_session_factory() as session:
            db_user = await session.get(User, user_id)
            if not db_user:
                raise HTTPException(status_code=404, detail="User not found")
            # Explicitly delete password reset tokens to avoid NOT NULL updates
            try:
                await session.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
            except Exception as de:
                print(f"[ADMIN][DELETE_USER][WARN] Failed to delete password reset tokens for user {user_id}: {de}")
            await session.delete(db_user)
            await session.commit()
        # After DB commit, remove storage folder
        try:
            if fm.is_r2:
                ok = fm.delete_user_folder(user_id)
                print(f"[ADMIN][DELETE_USER] R2 delete users/{user_id}/ -> {ok}")
            else:
                # Clean local uploads
                from pathlib import Path
                user_dir = Path(fm.uploads_dir) / str(user_id)
                import shutil
                if user_dir.exists():
                    shutil.rmtree(user_dir)
                print(f"[ADMIN][DELETE_USER] Local delete uploads/{user_id}/ done")
        except Exception as se:
            print(f"[ADMIN][DELETE_USER][WARN] Storage cleanup failed for user {user_id}: {se}")
        return {"message": "User deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ADMIN][DELETE_USER][ERROR] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.post("/users/{user_id}/recompute-totals")
async def admin_recompute_totals_for_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    await usage_service.recompute_totals_for_user(user_id)
    async with async_session_factory() as session:
        db_user = await session.get(User, user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        return await _enrich_user(db_user)


@router.post("/users/recompute-totals-all")
async def admin_recompute_totals_for_all(
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    count = await usage_service.recompute_totals_for_all_users()
    return {"updated_users": count} 