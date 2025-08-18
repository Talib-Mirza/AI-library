import asyncio
import os
from typing import List, Optional, Tuple, Any, Dict
import shutil
from datetime import datetime
import traceback

from fastapi import UploadFile, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db, async_session_factory
from app.models.book import Book, Bookmark, Highlight, Annotation, FileType
from app.schemas.book import BookCreate, BookUpdate, BookmarkCreate, HighlightCreate, AnnotationCreate, BookResponse
from app.core.config import settings
from app.services.pdf_processor import PDFProcessor
from app.services.file_manager import FileManager


class BookService:
    """Service for handling book operations."""
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the book service.
        
        Args:
            db: Optional database session.
        """
        self.db = db
        self.pdf_processor = PDFProcessor()
        self.file_manager = FileManager()
    
    async def create_book(
        self,
        book_in: BookCreate,
        file: UploadFile,
        file_content: bytes,
        file_type: FileType,
        file_size: int,
        user_id: int,
        cover_image: Optional[UploadFile] = None,
        cover_image_content: Optional[bytes] = None,
    ) -> Book:
        """
        Create a new book.
        
        Args:
            book_in: Book creation data
            file: Uploaded file
            file_content: File content
            file_type: File type
            file_size: File size in bytes
            user_id: User ID
            cover_image: Optional cover image file
            cover_image_content: Optional cover image content
            
        Returns:
            Created book object
        """
        session = self.db
        try:
            print(f"[CREATE] Start create_book user_id={user_id} size={file_size}B type={file_type}")
            # Generate unique PDF ID
            pdf_id = self.file_manager.generate_pdf_id()
            print(f"[CREATE] Generated pdf_id={pdf_id}")

            # Create book object first
            book = Book(
                title=book_in.title,
                author=book_in.author,
                description=book_in.description,
                pdf_id=pdf_id,
                file_path="",
                file_type=file_type,
                file_size=file_size,
                is_processed=False,
                user_id=user_id,
            )
            session.add(book)
            await session.commit()
            await session.refresh(book)
            print(f"[CREATE] Inserted book id={book.id}")

            # Save original file
            print(f"[CREATE] Saving original file ... STORAGE_BACKEND={settings.STORAGE_BACKEND}")
            file_path = await self.file_manager.save_uploaded_file(
                user_id=user_id,
                pdf_id=str(book.id),
                file=file,
                file_content=file_content,
            )
            print(f"[CREATE] Saved file. path_or_key={file_path}")

            # Update book with file path/key
            book.file_path = file_path

            # Handle cover image if provided
            if cover_image and cover_image_content:
                try:
                    print("[CREATE] Saving cover image ...")
                    _ = self.file_manager.save_cover_image(
                        user_id=user_id,
                        book_id=str(book.id),
                        cover_image_content=cover_image_content,
                        filename=cover_image.filename or "cover.jpg",
                    )
                    cover_image_url = self.file_manager.get_cover_image_url(user_id, str(book.id))
                    book.cover_image_url = cover_image_url
                    print(f"[CREATE] Cover image ready url={cover_image_url}")
                except Exception as ce:
                    print(f"[CREATE][WARN] Failed to save cover image: {ce}")
                    print(traceback.format_exc())

            await session.commit()
            await session.refresh(book)
            print(f"[CREATE] Finished create_book id={book.id}")
            return book
        except HTTPException:
            raise
        except Exception as e:
            print(f"[CREATE][ERROR] {type(e).__name__}: {e}")
            print(traceback.format_exc())
            # Try rollback to clean state
            try:
                await session.rollback()
            except Exception:
                pass
            raise
    
    async def process_book_background(self, book_id: int) -> None:
        """
        Process a book in the background.
        
        Args:
            book_id: Book ID
            
        Returns:
            None
        """
        async with async_session_factory() as session:
            try:
                # Get book with a lock for update
                result = await session.execute(
                    select(Book)
                    .where(Book.id == book_id)
                    .with_for_update()  # Lock the row
                )
                book = result.scalars().first()
                
                if not book:
                    print(f"Book {book_id} not found for processing")
                    return
                
                print(f"Processing book: {book.title} ({book.file_type})")
                
                if book.file_type == FileType.PDF:
                    # Process PDF content
                    content = self.pdf_processor.process_pdf(book.file_path)
                    
                    # Update book with processed content
                    book.is_processed = True
                    book.processing_error = None
                    book.page_count = content.get("total_pages", 0)
                    book.text_content = content.get("text_content", "")
                    
                    print(f"Successfully processed PDF book: {book.title}")
                else:
                    # For non-PDF files, just mark as processed
                    book.is_processed = True
                    print(f"Marked non-PDF book as processed: {book.title}")
                
                # Update book status and commit
                await session.commit()
                
            except Exception as e:
                print(f"Error processing book {book_id}: {str(e)}")
                await session.rollback()
                
                # Update book status to error
                try:
                    book = await session.get(Book, book_id)
                    if book:
                        book.is_processed = False
                        book.processing_error = str(e)
                        if hasattr(e, 'text_content'):
                            book.text_content = e.text_content
                        await session.commit()
                except Exception as commit_error:
                    print(f"Error updating book status: {str(commit_error)}")
                    await session.rollback()
    
    async def get_book_by_id(self, book_id: int) -> Optional[Book]:
        """
        Get a book by ID.
        
        Args:
            book_id: Book ID
            
        Returns:
            Book object if found, None otherwise
        """
        result = await self.db.execute(
            select(Book)
            .where(Book.id == book_id)
            .options(
                selectinload(Book.bookmarks),
                selectinload(Book.highlights),
                selectinload(Book.annotations)
            )
        )
        return result.scalars().first()
    
    async def get_books_by_user(
        self, user_id: int, page: int = 1, page_size: int = 10
    ) -> Tuple[List[Book], int]:
        """
        Get all books owned by a user.
        
        Args:
            user_id: User ID
            page: Page number
            page_size: Items per page
            
        Returns:
            Tuple of (books, total count)
        """
        session = self.db
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get books
        result = await session.execute(
            select(Book)
            .where(Book.user_id == user_id)
            .order_by(Book.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        books = result.scalars().all()
        
        # Get total count
        count_result = await session.execute(
            select(func.count()).select_from(Book).where(Book.user_id == user_id)
        )
        total = count_result.scalar_one()
        
        return list(books), total
    
    async def update_book(self, book_id: int, book_update: BookUpdate) -> Optional[Book]:
        """
        Update a book.
        
        Args:
            book_id: Book ID
            book_update: Book update data
            
        Returns:
            Updated book object if found, None otherwise
        """
        session = self.db
        
        # Get book
        result = await session.execute(select(Book).where(Book.id == book_id))
        book = result.scalars().first()
        
        if not book:
            return None
        
        # Update book fields
        update_data = book_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(book, field, value)
        
        # Commit changes
        await session.commit()
        await session.refresh(book)
        
        return book
    
    async def delete_book(self, book_id: int, user_id: int) -> bool:
        """
        Delete a book and its associated file.
        
        Args:
            book_id: Book ID
            user_id: User ID (for authorization)
            
        Returns:
            True if deleted successfully
            
        Raises:
            HTTPException if book not found or user not authorized
        """
        try:
            # Get the book with user check
            book = await self.get_book_by_id(book_id)
            if not book:
                print(f"Book {book_id} not found")
                raise HTTPException(status_code=404, detail="Book not found")
            
            if book.user_id != user_id:
                print(f"User {user_id} not authorized to delete book {book_id}")
                raise HTTPException(status_code=403, detail="Not authorized to delete this book")
            
            # Delete the entire book directory with all its contents (using book_id)
            try:
                print(f"Deleting book directory for user {user_id}, book_id {book_id}")
                success = self.file_manager.delete_pdf_directory(user_id, str(book_id))
                if not success:
                    print(f"Warning: Could not delete book directory for book {book_id}")
            except Exception as e:
                print(f"Error deleting book directory: {str(e)}")
                # Continue with database deletion even if file deletion fails
            
            # Delete embeddings from FAISS service
            try:
                from app.services.faiss_rag_service import faiss_rag_service
                document_id = f"user_{user_id}_book_{book_id}"
                print(f"Deleting embeddings for document_id: {document_id}")
                faiss_rag_service.delete_document_embeddings(document_id)
            except Exception as e:
                print(f"Warning: Could not delete embeddings for book {book_id}: {str(e)}")
                # Continue with database deletion even if embeddings deletion fails
            
            # Delete the book from database
            print(f"Deleting book {book_id} from database")
            await self.db.delete(book)
            await self.db.commit()
            print(f"Book {book_id} deleted successfully")
            
            return True
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            print(f"Unexpected error deleting book {book_id}: {str(e)}")
            await self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete book: {str(e)}"
            )
    
    # Bookmark methods
    async def create_bookmark(self, book_id: int, bookmark_in: BookmarkCreate) -> Bookmark:
        """Create a bookmark for a book."""
        session = self.db
        
        bookmark = Bookmark(
            page=bookmark_in.page,
            title=bookmark_in.title,
            book_id=book_id,
        )
        
        session.add(bookmark)
        await session.commit()
        await session.refresh(bookmark)
        
        return bookmark
    
    async def get_bookmarks_by_book(self, book_id: int) -> List[Bookmark]:
        """Get all bookmarks for a book."""
        session = self.db
        
        result = await session.execute(
            select(Bookmark)
            .where(Bookmark.book_id == book_id)
            .order_by(Bookmark.page)
        )
        
        return list(result.scalars().all())
    
    # Highlight methods
    async def create_highlight(self, book_id: int, highlight_in: HighlightCreate) -> Highlight:
        """Create a highlight for a book."""
        session = self.db
        
        highlight = Highlight(
            page=highlight_in.page,
            content=highlight_in.content,
            position_data=highlight_in.position_data,
            book_id=book_id,
        )
        
        session.add(highlight)
        await session.commit()
        await session.refresh(highlight)
        
        return highlight
    
    async def get_highlights_by_book(self, book_id: int) -> List[Highlight]:
        """Get all highlights for a book."""
        session = self.db
        
        result = await session.execute(
            select(Highlight)
            .where(Highlight.book_id == book_id)
            .order_by(Highlight.page)
        )
        
        return list(result.scalars().all())
    
    # Annotation methods
    async def create_annotation(self, book_id: int, annotation_in: AnnotationCreate) -> Annotation:
        """Create an annotation for a book."""
        session = self.db
        
        annotation = Annotation(
            page=annotation_in.page,
            content=annotation_in.content,
            position_data=annotation_in.position_data,
            book_id=book_id,
        )
        
        session.add(annotation)
        await session.commit()
        await session.refresh(annotation)
        
        return annotation
    
    async def get_annotations_by_book(self, book_id: int) -> List[Annotation]:
        """Get all annotations for a book."""
        session = self.db
        
        result = await session.execute(
            select(Annotation)
            .where(Annotation.book_id == book_id)
            .order_by(Annotation.page)
        )
        
        return list(result.scalars().all())
    
    async def get_book_content(self, book_id: int, user_id: int) -> Dict:
        """
        Get processed content of a book, using cached content if available.
        
        Args:
            book_id: Book ID
            user_id: User ID (for authorization)
            
        Returns:
            Dict containing processed book content
            
        Raises:
            HTTPException if book not found, user not authorized, or processing fails
        """
        print(f"Getting content for book {book_id} requested by user {user_id}")
        
        # Get the book with user check
        book = await self.get_book_by_id(book_id)
        if not book:
            print(f"Book {book_id} not found")
            raise HTTPException(status_code=404, detail="Book not found")
        
        print(f"Book found: {book.title}, user_id: {book.user_id}, pdf_id: {book.pdf_id}")
        
        if book.user_id != user_id:
            print(f"User {user_id} not authorized to access book {book_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this book")
        
        if book.file_type != FileType.PDF:
            print(f"Invalid file type: {book.file_type}")
            raise HTTPException(status_code=400, detail="File is not a PDF")
        
        try:
            # Check if processed content exists in cache (using book_id for directory)
            cached_content = self.file_manager.load_processed_content(user_id, str(book_id))
            
            if cached_content:
                print(f"Found cached content for book {book_id}")
                
                # Update book status if needed
                if not book.is_processed:
                    book.is_processed = True
                    book.processing_error = None
                    book.page_count = cached_content.get("total_pages", 0)
                    book.text_content = cached_content.get("text_content", "")
                    await self.db.commit()
                
                return cached_content
            
            # No cached content - need to process PDF
            print(f"No cached content found, processing PDF file: {book.file_path}")
            
            # Determine source file path
            source_path = book.file_path
            if settings.STORAGE_BACKEND.lower() == "r2":
                fm = self.file_manager
                try:
                    print("[CONTENT] Downloading from R2 to temp ...")
                    source_path = fm.download_object_to_temp(book.file_path, suffix=".pdf")
                    print(f"[CONTENT] Temp file: {source_path}")
                except Exception as e:
                    print(f"[CONTENT][ERROR] Download failed: {e}")
                    print(traceback.format_exc())
                    raise HTTPException(status_code=500, detail="Failed to fetch file from storage")
            
            # Verify file exists locally now
            if not source_path or not os.path.exists(source_path):
                print(f"[CONTENT][ERROR] File not found at path: {source_path}")
                raise HTTPException(status_code=404, detail="Book file not found")
            
            # Process the PDF and get structured content
            try:
                print("[CONTENT] Processing PDF ...")
                content = self.pdf_processor.process_pdf(source_path)
                print("[CONTENT] PDF processed")
            except Exception as e:
                print(f"[CONTENT][ERROR] PDF processing failed: {e}")
                print(traceback.format_exc())
                raise
            
            if not content or not content.get("pages"):
                raise ValueError("Invalid PDF content structure")
            
            print(f"Successfully processed PDF with {len(content.get('pages', []))} pages")
            
            # Cache the processed content (using book_id for directory)
            self.file_manager.save_processed_content(user_id, str(book_id), content)
            print(f"Cached processed content for book {book_id}")
            
            # Save metadata separately (using book_id for directory)
            metadata = {
                "title": book.title,
                "author": book.author,
                "total_pages": content.get("total_pages", 0),
                "file_size": book.file_size,
                "processed_at": str(datetime.utcnow()),
                "file_type": book.file_type.value
            }
            self.file_manager.save_metadata(user_id, str(book_id), metadata)
            
            # Update book status
            if not book.is_processed:
                book.is_processed = True
                book.processing_error = None
                book.page_count = content.get("total_pages", 0)
                book.text_content = content.get("text_content", "")
                await self.db.commit()
            
            return content
            
        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}") 