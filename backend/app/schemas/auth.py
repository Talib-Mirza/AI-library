from typing import Optional, List
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

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
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


class UserResponse(UserBase):
    """User response model."""
    id: int
    is_active: bool
    is_admin: bool
    has_active_subscription: bool
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    total_files_uploaded: int = 0
    total_tts_minutes: int = 0
    total_ai_queries: int = 0
    created_at: str
    subscription_status: Optional[str] = None
    subscription_tier: Optional[str] = None
    subscription_renewal_at: Optional[str] = None
    
    @field_validator('created_at', mode='before')
    @classmethod
    def validate_created_at(cls, v):
        """Convert datetime to string if needed."""
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    @field_validator('subscription_renewal_at', mode='before')
    @classmethod
    def validate_subscription_renewal_at(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
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


class GoogleCredential(BaseModel):
    """Google OAuth credential model."""
    credential: str = Field(..., description="Google OAuth ID token")


class ProfileUpdate(BaseModel):
    """Profile update model."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


class PasswordChange(BaseModel):
    """Password change model."""
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserStats(BaseModel):
    """User statistics model."""
    # Totals (lifetime)
    total_files_uploaded: int
    total_tts_minutes: int
    total_ai_queries: int = 0
    # Monthly usage (current period)
    monthly_tts_minutes_used: int = 0
    monthly_ai_queries_used: int = 0
    monthly_book_uploads_used: int = 0
    # Dates
    last_upload_date: Optional[str] = None
    last_tts_usage: Optional[str] = None 