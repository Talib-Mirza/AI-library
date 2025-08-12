from datetime import datetime, timezone
from calendar import monthrange
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.session import async_session_factory
from app.models.user import User

# Simple model-less access via SQL; if preferred, define ORM model later

FREE_LIMITS = {
    "tts_minutes": 10,
    "ai_queries": 10,
    "book_uploads": 5,
}

PRO_LIMITS = {
    "tts_minutes": 180,
    "ai_queries": 300,
    "book_uploads": 20,
}


def _period_bounds(dt: Optional[datetime] = None) -> Tuple[datetime, datetime]:
    now = dt or datetime.now(timezone.utc)
    start = datetime(year=now.year, month=now.month, day=1, tzinfo=timezone.utc)
    last_day = monthrange(now.year, now.month)[1]
    end = datetime(year=now.year, month=now.month, day=last_day, tzinfo=timezone.utc)
    return start, end


class UsageService:
    async def get_limits_for_user(self, user: User) -> dict:
        # Pro only if subscription is active/trialing AND tier is explicitly 'pro'
        if self.is_pro(user):
            return PRO_LIMITS
        return FREE_LIMITS

    def is_pro(self, user: User) -> bool:
        tier_is_pro = (user.subscription_tier or "").lower() == "pro"
        status_active = (user.subscription_status in ("active", "trialing"))
        return bool(tier_is_pro and status_active)

    async def get_or_create_current_period(self, user_id: int) -> dict:
        start, end = _period_bounds()
        from sqlalchemy import text
        async with async_session_factory() as session:
            res = await session.execute(
                text(
                    """
                    SELECT id, tts_minutes_used, ai_queries_used, book_uploads_used
                    FROM user_usage_periods
                    WHERE user_id = :uid AND period_start = :ps
                    LIMIT 1
                    """
                ),
                {"uid": user_id, "ps": start.date()},
            )
            row = res.first()
            if row:
                return {
                    "id": row[0],
                    "tts_minutes_used": row[1],
                    "ai_queries_used": row[2],
                    "book_uploads_used": row[3],
                    "period_start": start,
                    "period_end": end,
                }
            ins = await session.execute(
                text(
                    """
                    INSERT INTO user_usage_periods (user_id, period_start, period_end, tts_minutes_used, ai_queries_used, book_uploads_used)
                    VALUES (:uid, :ps, :pe, 0, 0, 0)
                    RETURNING id, tts_minutes_used, ai_queries_used, book_uploads_used
                    """
                ),
                {"uid": user_id, "ps": start.date(), "pe": end.date()},
            )
            new_row = ins.first()
            await session.commit()
            return {
                "id": new_row[0],
                "tts_minutes_used": new_row[1],
                "ai_queries_used": new_row[2],
                "book_uploads_used": new_row[3],
                "period_start": start,
                "period_end": end,
            }

    async def get_usage(self, user_id: int) -> dict:
        period = await self.get_or_create_current_period(user_id)
        return period

    async def is_within_limit(self, user: User, feature: str) -> bool:
        try:
            limits = await self.get_limits_for_user(user)
            if self.is_pro(user):
                # Monthly for pro
                usage = await self.get_usage(user.id)
                used = usage.get(f"{feature}_used", 0)
                return used < limits[f"{feature}"]
            else:
                # Totals for free
                total_map = {
                    "tts_minutes": user.total_tts_minutes or 0,
                    "ai_queries": user.total_ai_queries or 0,
                    "book_uploads": user.total_files_uploaded or 0,
                }
                used_total = total_map[feature]
                return used_total < limits[f"{feature}"]
        except Exception:
            # fail-open in case of transient usage store issues
            return True

    async def increment(self, user_id: int, feature: str, amount: int = 1) -> None:
        start, _ = _period_bounds()
        from sqlalchemy import text
        try:
            # ensure a current period row exists
            await self.get_or_create_current_period(user_id)
            async with async_session_factory() as session:
                col = {
                    "tts_minutes": "tts_minutes_used",
                    "ai_queries": "ai_queries_used",
                    "book_uploads": "book_uploads_used",
                }[feature]
                # Monthly increment
                await session.execute(
                    text(
                        f"""
                        UPDATE user_usage_periods
                        SET {col} = {col} + :amt
                        WHERE user_id = :uid AND period_start = :ps
                        """
                    ),
                    {"amt": amount, "uid": user_id, "ps": start.date()},
                )
                # Total increment (aggregate on users)
                agg_col = {
                    "tts_minutes": "total_tts_minutes",
                    "ai_queries": "total_ai_queries",
                    "book_uploads": "total_files_uploaded",
                }[feature]
                await session.execute(
                    text(
                        f"""
                        UPDATE users
                        SET {agg_col} = CASE WHEN ({agg_col} + :amt) < 0 THEN 0 ELSE {agg_col} + :amt END
                        WHERE id = :uid
                        """
                    ),
                    {"amt": amount, "uid": user_id},
                )
                await session.commit()
        except Exception as e:
            # log and fail-open; do not block core flow
            print(f"[UsageService] Failed to increment usage for user {user_id}, feature {feature}: {e}")

    async def get_plan_overview(self, user: User) -> dict:
        limits = await self.get_limits_for_user(user)
        usage = await self.get_usage(user.id)
        is_pro = self.is_pro(user)
        limit_scope = 'monthly' if is_pro else 'total'
        totals = {
            "tts_minutes": user.total_tts_minutes or 0,
            "ai_queries": user.total_ai_queries or 0,
            "book_uploads": user.total_files_uploaded or 0,
        }
        return {
            "tier": (user.subscription_tier or "free").lower(),
            "status": user.subscription_status,
            "renewal_at": user.subscription_renewal_at,
            "limits": limits,
            "limit_scope": limit_scope,
            "usage": {
                "tts_minutes": usage.get("tts_minutes_used", 0),
                "ai_queries": usage.get("ai_queries_used", 0),
                "book_uploads": usage.get("book_uploads_used", 0),
            },
            "totals": totals,
            "remaining": {
                # Remaining is computed w.r.t. the limit scope for display, but client should gate per scope rules
                "tts_minutes": max(0, limits["tts_minutes"] - (usage.get("tts_minutes_used", 0) if is_pro else totals["tts_minutes"])),
                "ai_queries": max(0, limits["ai_queries"] - (usage.get("ai_queries_used", 0) if is_pro else totals["ai_queries"])),
                "book_uploads": max(0, limits["book_uploads"] - (usage.get("book_uploads_used", 0) if is_pro else totals["book_uploads"])),
            },
        }

usage_service = UsageService() 