import asyncio
import os
from typing import Optional
from sqlalchemy import select, update

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.user import User
from app.services.user import UserService


async def set_admin_user(
    email: Optional[str] = None,
    password: Optional[str] = None,
    demote_others: bool = False,
) -> None:
    email = email or settings.INIT_ADMIN_EMAIL
    password = password or settings.INIT_ADMIN_PASSWORD
    if not email or not password:
        print("INIT_ADMIN_EMAIL and INIT_ADMIN_PASSWORD are required")
        return

    usvc = UserService()
    async with async_session_factory() as session:
        # Find existing user by email
        res = await session.execute(select(User).where(User.email == email))
        user = res.scalars().first()

        if not user:
            # Create new user
            user = User(
                email=email,
                full_name=email.split("@")[0],
                hashed_password=usvc.get_password_hash(password),
                is_active=True,
                is_verified=True,
                is_admin=True,
                subscription_status="active",
                subscription_tier="pro",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"Created admin user {email}")
        else:
            # Update password and admin flags
            user.hashed_password = usvc.get_password_hash(password)
            user.is_active = True
            user.is_verified = True
            user.is_admin = True
            await session.commit()
            print(f"Updated admin user {email}")

        if demote_others:
            # Demote all other admins
            await session.execute(
                update(User)
                .where((User.is_admin == True) & (User.email != email))
                .values(is_admin=False)
            )
            await session.commit()
            print("Demoted other admin users")


if __name__ == "__main__":
    # Allow overrides via env vars
    email = os.getenv("NEW_ADMIN_EMAIL") or settings.INIT_ADMIN_EMAIL
    password = os.getenv("NEW_ADMIN_PASSWORD") or settings.INIT_ADMIN_PASSWORD
    demote = os.getenv("DEMOTE_OTHER_ADMINS", "0") in ("1", "true", "True")
    asyncio.run(set_admin_user(email=email, password=password, demote_others=demote)) 