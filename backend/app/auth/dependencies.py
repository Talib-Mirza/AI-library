from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import ALGORITHM, decode_token
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.user import UserService
from app.services.usage_service import usage_service

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from the token.
    
    Args:
        token: JWT token.
        db: Database session.
        
    Returns:
        User object.
        
    Raises:
        HTTPException: If authentication fails.
    """
    # For development: if DEBUG mode is on and development testing is enabled
    # return a mock user
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token
        payload = decode_token(token)
        
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        token_type: str = payload.get("type")
        
        # Basic validation
        if email is None or user_id is None:
            print(f"❌ JWT validation failed - Email: {email}, User ID: {user_id}")
            raise credentials_exception
        
        # Check if token is an access token
        if token_type != "access":
            print(f"❌ JWT validation failed - Wrong token type: {token_type}")
            raise credentials_exception
    
    except JWTError as e:
        print(f"❌ JWT decode error: {e}")
        raise credentials_exception
    
    # Get the user from the database
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get the current active user.
    
    Args:
        current_user: Current authenticated user.
        
    Returns:
        User object if active.
        
    Raises:
        HTTPException: If user is not active.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    return current_user


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get the current admin user.
    
    Args:
        current_user: Current authenticated user.
        
    Returns:
        User object if admin.
        
    Raises:
        HTTPException: If user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    return current_user


async def get_current_active_subscriber(current_user: User = Depends(get_current_user)) -> User:
    """
    Get the current active user with an active subscription.
    
    Args:
        current_user: Current authenticated user.
        
    Returns:
        User object if active subscriber.
        
    Raises:
        HTTPException: If user is not an active subscriber.
    """
    if not current_user.has_active_subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription required",
        )
    
    return current_user 

async def require_within_ai_query_quota(current_user: User = Depends(get_current_user)):
    within = await usage_service.is_within_limit(current_user, 'ai_queries')
    if not within:
        raise HTTPException(status_code=402, detail='AI query limit reached. Upgrade to Pro to continue.')

async def require_within_tts_quota(current_user: User = Depends(get_current_user)):
    within = await usage_service.is_within_limit(current_user, 'tts_minutes')
    if not within:
        raise HTTPException(status_code=402, detail='TTS minutes limit reached. Upgrade to Pro to continue.')

async def require_within_upload_quota(current_user: User = Depends(get_current_user)):
    within = await usage_service.is_within_limit(current_user, 'book_uploads')
    if not within:
        raise HTTPException(status_code=402, detail='Book uploads limit reached. Upgrade to Pro to continue.') 