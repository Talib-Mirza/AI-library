from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.book import FileType


# Base schemas
class BookmarkBase(BaseModel):
    """Base bookmark model."""
    page: int
    title: Optional[str] = None


class HighlightBase(BaseModel):
    """Base highlight model."""
    page: int
    content: str
    position_data: Optional[str] = None


class AnnotationBase(BaseModel):
    """Base annotation model."""
    page: int
    content: str
    position_data: Optional[str] = None


# Creation schemas
class BookmarkCreate(BookmarkBase):
    """Bookmark creation model."""
    pass


class HighlightCreate(HighlightBase):
    """Highlight creation model."""
    pass


class AnnotationCreate(AnnotationBase):
    """Annotation creation model."""
    pass


class BookCreate(BaseModel):
    """Book creation model."""
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    # The file itself is uploaded separately


# Response schemas
class BookmarkResponse(BookmarkBase):
    """Bookmark response model."""
    id: int
    book_id: int
    created_at: str
    updated_at: str
    
    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def validate_datetime_fields(cls, v):
        """Convert datetime to string if needed."""
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    class Config:
        from_attributes = True


class HighlightResponse(HighlightBase):
    """Highlight response model."""
    id: int
    book_id: int
    created_at: str
    updated_at: str
    
    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def validate_datetime_fields(cls, v):
        """Convert datetime to string if needed."""
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    class Config:
        from_attributes = True


class AnnotationResponse(AnnotationBase):
    """Annotation response model."""
    id: int
    book_id: int
    created_at: str
    updated_at: str
    
    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def validate_datetime_fields(cls, v):
        """Convert datetime to string if needed."""
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    class Config:
        from_attributes = True


class BookResponse(BaseModel):
    """Book response model."""
    id: int
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    pdf_id: str
    file_path: str
    file_type: FileType
    file_size: int
    cover_image_url: Optional[str] = None
    is_processed: bool
    processing_error: Optional[str] = None
    page_count: Optional[int] = None
    user_id: int
    created_at: str
    updated_at: str
    
    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def validate_datetime_fields(cls, v):
        """Convert datetime to string if needed."""
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    class Config:
        from_attributes = True


class BookDetailResponse(BookResponse):
    """Detailed book response model with bookmarks, highlights, and annotations."""
    bookmarks: List[BookmarkResponse] = []
    highlights: List[HighlightResponse] = []
    annotations: List[AnnotationResponse] = []
    
    class Config:
        from_attributes = True


# Update schemas
class BookmarkUpdate(BaseModel):
    """Bookmark update model."""
    title: Optional[str] = None


class HighlightUpdate(BaseModel):
    """Highlight update model."""
    content: Optional[str] = None
    position_data: Optional[str] = None


class AnnotationUpdate(BaseModel):
    """Annotation update model."""
    content: Optional[str] = None
    position_data: Optional[str] = None


class BookUpdate(BaseModel):
    """Book update model."""
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None 