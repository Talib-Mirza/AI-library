from typing import Optional, Tuple, List

from passlib.context import CryptContext
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.session import get_db, async_session_factory
from app.models.user import User
from app.schemas.auth import UserCreate, UserUpdate
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
                subscription_status="active",  # Set default subscription status for development
                subscription_tier="basic"  # Set default subscription tier
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