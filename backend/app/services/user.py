from typing import Optional, Tuple, List

from passlib.context import CryptContext
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.session import get_db, async_session_factory
from app.models.user import User
from app.schemas.auth import UserCreate, UserUpdate, ProfileUpdate, UserStats
from app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """User service for handling user operations."""
    
    def __init__(self, db: Optional[AsyncSession] = None):
        """
        Initialize the user service.
        
        Args:
            db: Optional database session.
        """
        self.db = db
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against a hash.
        
        Args:
            plain_password: Plain text password.
            hashed_password: Hashed password.
            
        Returns:
            True if the password matches the hash, False otherwise.
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """
        Get password hash.
        
        Args:
            password: Plain text password.
            
        Returns:
            Hashed password.
        """
        return pwd_context.hash(password)
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get a user by email.
        
        Args:
            email: User email.
            
        Returns:
            User object if found, None otherwise.
        """
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == email))
            return result.scalars().first()
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """
        Get a user by ID.
        
        Args:
            user_id: User ID.
            
        Returns:
            User object if found, None otherwise.
        """
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            return result.scalars().first()
    
    async def create(self, user_in: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            user_in: User creation data.
            
        Returns:
            Created user object.
        """
        async with async_session_factory() as session:
            # Determine if this should be an admin user
            is_admin = False
            if user_in.admin_secret:
                if user_in.admin_secret == settings.ADMIN_SECRET_KEY:
                    is_admin = True
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid admin secret key"
                    )
            
            # Create user object with default subscription status for development
            user = User(
                email=user_in.email,
                full_name=user_in.full_name,
                hashed_password=self.get_password_hash(user_in.password),
                is_active=True,
                is_admin=is_admin,
                # Default to free tier with no active subscription
                subscription_status="canceled",
                subscription_tier="free",
                # Initialize new profile fields with defaults
                total_files_uploaded=0,
                total_tts_minutes=0
            )
            
            # Add and commit
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
            return user
    
    async def update(self, user_id: int, user_in: UserUpdate) -> Optional[User]:
        """
        Update a user.
        
        Args:
            user_id: User ID.
            user_in: User update data.
            
        Returns:
            Updated user object if found, None otherwise.
        """
        async with async_session_factory() as session:
            # Get user
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
            
            if not user:
                return None
            
            # Update user fields
            update_data = user_in.dict(exclude_unset=True)
            
            if "password" in update_data:
                update_data["hashed_password"] = self.get_password_hash(update_data.pop("password"))
            
            for field, value in update_data.items():
                setattr(user, field, value)
            
            # Commit changes
            await session.commit()
            await session.refresh(user)
            
            return user
    
    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user with email and password.
        
        Args:
            email: User email.
            password: User password.
            
        Returns:
            User object if authentication is successful, None otherwise.
        """
        user = await self.get_by_email(email)
        
        if not user:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        return user

    async def get_all_users(self, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        """
        Get all users with pagination.
        
        Args:
            skip: Number of users to skip
            limit: Maximum number of users to return
            
        Returns:
            Tuple of (users list, total count)
        """
        async with async_session_factory() as session:
            # Get users with pagination
            result = await session.execute(
                select(User)
                .order_by(User.id)
                .offset(skip)
                .limit(limit)
            )
            users = result.scalars().all()
            
            # Get total count
            count_result = await session.execute(
                select(func.count()).select_from(User)
            )
            total = count_result.scalar_one()
            
            return list(users), total

    async def update_profile(self, user_id: int, profile_update: ProfileUpdate) -> User:
        """
        Update user profile information.
        """
        async with async_session_factory() as session:
            user = await session.get(User, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            # Update fields if provided
            if profile_update.full_name is not None:
                user.full_name = profile_update.full_name
            if profile_update.bio is not None:
                user.bio = profile_update.bio
            if profile_update.location is not None:
                user.location = profile_update.location
            if profile_update.website is not None:
                user.website = profile_update.website
            await session.commit()
            # No need to refresh, user is already in this session
            return user

    async def update_password(self, user_id: int, new_password: str) -> None:
        """
        Update user password.
        
        Args:
            user_id: User ID.
            new_password: New password.
        """
        async with async_session_factory() as session:
            # IMPORTANT: load user in the same session we will commit in
            user = await session.get(User, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user.hashed_password = self.get_password_hash(new_password)
            await session.commit()

    async def get_user_stats(self, user_id: int) -> UserStats:
        """
        Get user statistics.
        
        Args:
            user_id: User ID.
            
        Returns:
            User statistics.
        """
        async with async_session_factory() as session:
            # Get user
            user = await self.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Get last upload date
            from app.models.book import Book
            last_upload_result = await session.execute(
                select(Book.created_at)
                .where(Book.user_id == user_id)
                .order_by(Book.created_at.desc())
                .limit(1)
            )
            last_upload_date = last_upload_result.scalar()

            # Monthly usage
            from sqlalchemy import text
            start, _ = __import__('app.services.usage_service', fromlist=['_period_bounds'])._period_bounds()
            res = await session.execute(
                text(
                    """
                    SELECT tts_minutes_used, ai_queries_used, book_uploads_used
                    FROM user_usage_periods
                    WHERE user_id = :uid AND period_start = :ps
                    LIMIT 1
                    """
                ),
                {"uid": user_id, "ps": start.date()},
            )
            row = res.first()
            monthly_tts = row[0] if row else 0
            monthly_ai = row[1] if row else 0
            monthly_uploads = row[2] if row else 0
            
            return UserStats(
                total_files_uploaded=user.total_files_uploaded,
                total_tts_minutes=user.total_tts_minutes,
                total_ai_queries=user.total_ai_queries,
                monthly_tts_minutes_used=monthly_tts,
                monthly_ai_queries_used=monthly_ai,
                monthly_book_uploads_used=monthly_uploads,
                last_upload_date=last_upload_date.isoformat() if last_upload_date else None,
                last_tts_usage=None
            )

    async def increment_tts_minutes(self, user_id: int, minutes: int) -> None:
        """
        Increment user's total TTS minutes.
        
        Args:
            user_id: User ID.
            minutes: Number of minutes to add.
        """
        async with async_session_factory() as session:
            user = await session.get(User, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user.total_tts_minutes += minutes
            await session.commit()

    async def increment_ai_queries(self, user_id: int, amount: int = 1) -> None:
        """Increment user's total AI chat queries."""
        async with async_session_factory() as session:
            user = await session.get(User, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            user.total_ai_queries += amount
            await session.commit()

    async def delete_user(self, user_id: int) -> None:
        """
        Delete user account.
        
        Args:
            user_id: User ID.
        """
        async with async_session_factory() as session:
            user = await self.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            await session.delete(user)
            await session.commit() 