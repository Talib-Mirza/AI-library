import os
import traceback
from typing import Any, List, Dict

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi import Request

from app.auth.dependencies import get_current_user, require_within_upload_quota
from app.core.config import settings
from app.db.session import get_db
from app.models.book import FileType
from app.models.user import User
from app.schemas.book import (
    AnnotationCreate,
    AnnotationResponse,
    AnnotationUpdate,
    BookCreate,
    BookDetailResponse,
    BookmarkCreate,
    BookmarkResponse,
    BookmarkUpdate,
    BookResponse,
    BookUpdate,
    HighlightCreate,
    HighlightResponse,
    HighlightUpdate,
)
from app.schemas.common import PaginatedResponse, PaginationParams, SuccessResponse
from app.services.book import BookService
from app.services.usage_service import usage_service
from app.services.file_manager import FileManager

router = APIRouter()


@router.post("/", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    request: Request,
    title: str = Form(...),
    author: str = Form(None),
    description: str = Form(None),
    file: UploadFile = File(...),
    cover_image: UploadFile = File(None),  # Optional cover image
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_within_upload_quota)
) -> Any:
    """
    Create a new book by uploading a file.
    """
    try:
        print("[UPLOAD] Begin create_book")
        print(f"[UPLOAD] User: {current_user.id}, STORAGE_BACKEND={settings.STORAGE_BACKEND}")
        # Log request headers to diagnose transport/content-type issues
        try:
            cl = request.headers.get('content-length')
            ct = request.headers.get('content-type')
            ua = request.headers.get('user-agent')
            orh = request.headers.get('origin')
            enc = request.headers.get('content-encoding')
            print(f"[UPLOAD] Headers: content-type={ct}, content-length={cl}, content-encoding={enc}, origin={orh}, user-agent={ua}")
        except Exception as hdr_e:
            print(f"[UPLOAD][WARN] Failed to log headers: {hdr_e}")
        if settings.STORAGE_BACKEND.lower() == "r2":
            print(
                f"[UPLOAD] R2 cfg: bucket={settings.R2_BUCKET}, endpoint={settings.R2_ENDPOINT}, access_key_set={bool(settings.R2_ACCESS_KEY_ID)}"
            )

        # Validate file extension
        file_ext = os.path.splitext(file.filename or "")[1].lower().lstrip(".")
        print(f"[UPLOAD] Incoming file: name={file.filename}, ext={file_ext}, content_type={file.content_type}")
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not supported. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}",
            )

        # Read file content and size
        content = await file.read()
        file_size = len(content)
        await file.seek(0)
        print(f"[UPLOAD] File size bytes={file_size}")

        if file_size > settings.MAX_UPLOAD_SIZE:
            max_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {max_mb:.1f}MB",
            )

        # Cover validation
        cover_image_content = None
        if cover_image and cover_image.filename:
            image_ext = os.path.splitext(cover_image.filename)[1].lower().lstrip(".")
            print(f"[UPLOAD] Cover image: name={cover_image.filename}, ext={image_ext}, ct={cover_image.content_type}")
            allowed_image_types = ["jpg", "jpeg", "png", "gif", "webp"]
            if image_ext not in allowed_image_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid image type. Allowed types: {', '.join(allowed_image_types)}",
                )
            cover_image_content = await cover_image.read()
            if len(cover_image_content) > 5 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cover image too large. Maximum size: 5MB",
                )

        book_service = BookService(db)
        book_create = BookCreate(title=title, author=author, description=description)
        file_type = FileType(file_ext)

        print("[UPLOAD] Calling BookService.create_book ...")
        book = await book_service.create_book(
            book_in=book_create,
            file=file,
            file_content=content,
            file_type=file_type,
            file_size=file_size,
            user_id=current_user.id,
            cover_image=cover_image,
            cover_image_content=cover_image_content,
        )
        print(f"[UPLOAD] Book created id={book.id}")

        # increment usage
        await usage_service.increment(current_user.id, 'book_uploads', 1)
        print("[UPLOAD] Usage incremented")

        # Start processing the book in the background
        await book_service.process_book_background(book.id)
        print("[UPLOAD] Background processing started")

        return book
    except HTTPException as he:
        print(f"[UPLOAD][HTTPException] {he.detail}")
        print(traceback.format_exc())
        raise
    except Exception as e:
        print(f"[UPLOAD][ERROR] {type(e).__name__}: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"UploadError: {type(e).__name__}: {e}")


@router.get("/", response_model=PaginatedResponse[BookResponse])
async def list_books(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    List all books owned by the current user.
    
    Supports pagination.
    """
    book_service = BookService(db)
    books, total = await book_service.get_books_by_user(
        user_id=current_user.id,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    
    # Calculate total pages
    pages = (total + pagination.page_size - 1) // pagination.page_size
    
    return {
        "items": books,
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
        "pages": pages,
    }


@router.get("/{book_id}", response_model=BookDetailResponse)
async def get_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get a book by ID.
    
    Returns the book details, along with bookmarks, highlights, and annotations.
    """
    book_service = BookService(db)
    book = await book_service.get_book_by_id(book_id)
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    
    # Check ownership
    if book.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    return book


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book_update: BookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Update a book's metadata.
    """
    book_service = BookService(db)
    book = await book_service.get_book_by_id(book_id)
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    
    # Check ownership
    if book.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    updated_book = await book_service.update_book(book_id, book_update)
    return updated_book


@router.delete("/{book_id}", response_model=SuccessResponse)
async def delete_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Delete a book.
    """
    book_service = BookService(db)
    book = await book_service.get_book_by_id(book_id)
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    
    # Check ownership
    if book.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    try:
        success = await book_service.delete_book(book_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete the book",
            )
        
        return {"success": True}
    except Exception as e:
        print(f"Error deleting book: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete the book: {str(e)}",
        )


# Bookmark endpoints
@router.post("/{book_id}/bookmarks", response_model=BookmarkResponse)
async def create_bookmark(
    book_id: int,
    bookmark_in: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Create a bookmark for a book.
    """
    book_service = BookService(db)
    book = await book_service.get_book_by_id(book_id)
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    
    # Check ownership
    if book.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    bookmark = await book_service.create_bookmark(book_id, bookmark_in)
    return bookmark


@router.get("/{book_id}/bookmarks", response_model=List[BookmarkResponse])
async def list_bookmarks(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    List all bookmarks for a book.
    """
    book_service = BookService(db)
    book = await book_service.get_book_by_id(book_id)
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    
    # Check ownership
    if book.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    bookmarks = await book_service.get_bookmarks_by_book(book_id)
    return bookmarks


# Similar endpoints for highlights and annotations can be added here 


@router.get("/{book_id}/content", response_model=None)
async def get_book_content(
    book_id: int,
    processed: bool = Query(False, description="Whether to return processed content instead of raw file"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get book content for reading.
    
    Args:
        book_id: The ID of the book
        processed: If True, returns processed content. If False, returns the raw file
        
    Returns:
        For processed=True: Dictionary containing processed content
        For processed=False: FileResponse with the raw file
    """
    book_service = BookService(db)
    
    try:
        if processed:
            print(f"[API] Getting processed content for book {book_id}")
            return await book_service.get_book_content(book_id, current_user.id)
            
        book = await book_service.get_book_by_id(book_id)
        
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found",
            )
        
        # Check ownership
        if book.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        
        # Get file path
        file_path = book.file_path
        
        # If using R2, file_path holds the object key. Redirect to presigned URL.
        if settings.STORAGE_BACKEND.lower() == "r2":
            fm = FileManager()
            try:
                url = fm.s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": fm.bucket, "Key": file_path},
                    ExpiresIn=settings.R2_PRESIGN_TTL_SECONDS,
                )
                return RedirectResponse(url, status_code=302)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {e}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on disk",
            )
        
        # Get original filename from the stored path
        original_filename = os.path.basename(file_path)
        
        # Return file based on type with proper content disposition
        if book.file_type == FileType.PDF:
            return FileResponse(
                file_path,
                filename=original_filename,
                media_type="application/pdf",
                content_disposition_type="attachment"
            )
        elif book.file_type == FileType.EPUB:
            return FileResponse(
                file_path,
                filename=original_filename,
                media_type="application/epub+zip",
                content_disposition_type="attachment"
            )
        elif book.file_type == FileType.TXT:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                return FileResponse(
                    file_path,
                    filename=original_filename,
                    media_type="text/plain",
                    content_disposition_type="attachment"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error reading file: {str(e)}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {book.file_type}",
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error getting book content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 

@router.get("/{book_id}/pdf")
async def get_book_pdf(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get PDF file for viewing in browser.
    
    Returns the PDF file with inline content disposition for browser viewing.
    """
    book_service = BookService(db)
    
    try:
        book = await book_service.get_book_by_id(book_id)
        
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found",
            )
        
        # Check ownership
        if book.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        
        # Only serve PDF files
        if book.file_type != FileType.PDF:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint only serves PDF files",
            )
        
        # Get file path
        file_path = book.file_path
        
        if settings.STORAGE_BACKEND.lower() == "r2":
            fm = FileManager()
            try:
                url = fm.s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": fm.bucket, "Key": file_path},
                    ExpiresIn=settings.R2_PRESIGN_TTL_SECONDS,
                )
                return RedirectResponse(url, status_code=302)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to generate PDF URL: {e}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF file not found on disk",
            )
        
        # Get original filename from the stored path
        original_filename = os.path.basename(file_path)
        
        # Return PDF with inline content disposition for browser viewing
        return FileResponse(
            file_path,
            filename=original_filename,
            media_type="application/pdf",
            content_disposition_type="inline"  # This allows viewing in browser
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error serving PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error serving PDF: {str(e)}"
        ) 