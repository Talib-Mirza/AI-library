from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field

# User schemas
class UserBase(BaseModel):
    """Base user model with common fields."""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """User creation model with password."""
    password: str = Field(..., min_length=8)
    admin_secret: Optional[str] = None  # Optional field for admin registration


class UserUpdate(BaseModel):
    """User update model with optional fields."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """User response model."""
    id: int
    is_active: bool
    is_admin: bool
    has_active_subscription: bool
    
    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    """User model with password hash (internal use only)."""
    hashed_password: str


# Token schemas
class Token(BaseModel):
    """Token response model."""
    access_token: str
    refresh_token: str
    token_type: str


class TokenPayload(BaseModel):
    """Token payload model for refresh requests."""
    user_id: int
    refresh_token: str


class TokenData(BaseModel):
    """Token data model."""
    email: Optional[str] = None
    user_id: Optional[int] = None


class PaginatedUsers(BaseModel):
    """Paginated users response model."""
    items: List[UserResponse]
    total: int
    skip: int
    limit: int 