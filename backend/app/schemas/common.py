from typing import Any, Dict, Generic, List, Optional, TypeVar, Union

from pydantic import BaseModel, Field

# Generic type for Pydantic models
T = TypeVar("T")


class SuccessResponse(BaseModel):
    """Simple success response model."""
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response model."""
    detail: str


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=10, ge=1, le=100, description="Items per page")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response model."""
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int 