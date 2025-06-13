from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.auth.dependencies import get_current_user, get_current_admin_user
from app.auth.jwt import create_access_token, create_refresh_token
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import Token, TokenPayload, UserCreate, UserResponse, PaginatedUsers
from app.schemas.common import SuccessResponse
from app.services.user import UserService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate) -> Any:
    """Register a new user."""
    # Check if user exists
    user_service = UserService()
    print(user_create.full_name)
    if await user_service.get_by_email(user_create.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )
    
    # Create user
    user = await user_service.create(user_create)
    
    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """Login with username and password to get access and refresh tokens."""
    # Authenticate user
    user_service = UserService()
    user = await user_service.authenticate(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    # Create tokens
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
        
        return {
            "access_token": access_token,
            "refresh_token": token_payload.refresh_token,
            "token_type": "bearer",
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)) -> Any:
    """Logout the current user."""
    # In a real implementation, you would invalidate the token here
    # For example, add it to a blacklist in Redis
    # For now, we'll just return success
    return {"success": True}


@router.get("/users", response_model=PaginatedUsers)
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """
    Get all users with pagination.
    Only accessible by admin users.
    """
    user_service = UserService()
    users, total = await user_service.get_all_users(skip=skip, limit=limit)
    
    return {
        "items": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_data(current_user: User = Depends(get_current_user)) -> Any:
    """Get current user data."""
    return current_user 