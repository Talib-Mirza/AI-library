from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class FileType(str, Enum):
    """Supported file types."""
    PDF = "pdf"
    EPUB = "epub"
    TXT = "txt"


class Book(Base):
    """Book model for database representation."""
    __tablename__ = "books"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    author = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    # File information
    pdf_id = Column(String(36), nullable=False, unique=True, index=True)  # UUID for organized storage
    file_path = Column(String(255), nullable=False)
    file_type = Column(SQLAEnum(FileType), nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    cover_image_url = Column(String(255), nullable=True)  # Path to cover image file
    
    # Document processing status
    is_processed = Column(Boolean, default=False, nullable=False)
    processing_error = Column(Text, nullable=True)
    page_count = Column(Integer, nullable=True)
    text_content = Column(Text, nullable=True)  # Store extracted text content
    
    # User ownership
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", foreign_keys=[user_id], back_populates="books")
    
    # Tags (stored as comma-separated values)
    tags = Column(Text, nullable=True)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    bookmarks = relationship("Bookmark", back_populates="book", cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="book", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="book", cascade="all, delete-orphan")


class Bookmark(Base):
    """Bookmark model for database representation."""
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    page = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    
    # Relations
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    book = relationship("Book", back_populates="bookmarks")
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Highlight(Base):
    """Highlight model for database representation."""
    __tablename__ = "highlights"
    
    id = Column(Integer, primary_key=True, index=True)
    page = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    position_data = Column(Text, nullable=True)  # JSON data with position information
    
    # Relations
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    book = relationship("Book", back_populates="highlights")
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Annotation(Base):
    """Annotation model for database representation."""
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    page = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    position_data = Column(Text, nullable=True)  # JSON data with position information
    
    # Relations
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    book = relationship("Book", back_populates="annotations")
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False) 