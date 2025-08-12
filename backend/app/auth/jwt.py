from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import jwt, JWTError

from app.core.config import settings

# Constants
ALGORITHM = "HS256"


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a new JWT access token.
    
    Args:
        data: Data to encode in the token.
        expires_delta: Optional expiration time delta.
        
    Returns:
        Encoded JWT token as a string.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a new JWT refresh token.
    
    Args:
        data: Data to encode in the token.
        expires_delta: Optional expiration time delta.
        
    Returns:
        Encoded JWT token as a string.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_email_verification_token(user_id: int, email: str, expires_hours: int | None = None) -> str:
    """Create a short-lived email verification token with a distinct type."""
    hours = expires_hours or settings.EMAIL_VERIFICATION_EXPIRE_HOURS
    expire = datetime.utcnow() + timedelta(hours=hours)
    payload = {"sub": email, "user_id": user_id, "type": "email_verify", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Generic decode for access tokens used in dependencies."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])


def decode_email_verification_token(token: str) -> Dict[str, Any]:
    """Decode and validate an email verification token."""
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != "email_verify":
        raise JWTError("Invalid token type")
    return payload 