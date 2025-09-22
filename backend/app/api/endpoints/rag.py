from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.faiss_rag_service import faiss_rag_service
from app.services.book import BookService
from app.auth.dependencies import get_current_user, require_within_ai_query_quota
from app.services.usage_service import usage_service
from app.models.user import User
from app.db.session import get_db
from app.core.config import settings
from app.services.user import UserService

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
async def rag_health_check():
    """Check if RAG service is properly initialized"""
    try:
        is_initialized = faiss_rag_service.initialized
        has_chat_model = faiss_rag_service.chat_model is not None
        has_embeddings = faiss_rag_service.embeddings is not None
        
        return {
            "status": "ok" if is_initialized else "error",
            "initialized": is_initialized,
            "has_chat_model": has_chat_model,
            "has_embeddings": has_embeddings,
            "openai_key_configured": bool(settings.OPENAI_API_KEY)
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

# Pydantic models for request/response
class EmbedDocumentRequest(BaseModel):
    document_text: str = Field(..., description="The document text to embed")
    document_id: str = Field(..., description="Unique identifier for the document")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class EmbedDocumentResponse(BaseModel):
    success: bool
    document_id: str
    message: str
    chunk_count: Optional[int] = None

class AskQuestionRequest(BaseModel):
    question: str = Field(..., description="The question to ask")
    document_id: str = Field(..., description="The document to query")
    conversation_history: Optional[List[Dict[str, str]]] = Field(None, description="Previous conversation")

class AskQuestionResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    document_id: str
    question: str
    book: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class DocumentStatsResponse(BaseModel):
    document_id: str
    chunk_count: int
    metadata: Dict[str, Any]
    error: Optional[str] = None

@router.post("/embed", response_model=EmbedDocumentResponse)
async def embed_document(
    request: EmbedDocumentRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Embed a document for RAG queries
    """
    try:
        # Add user ID to metadata
        metadata = request.metadata or {}
        metadata["user_id"] = current_user.id
        metadata["embedded_by"] = current_user.email
        
        # Use user-specific document ID to prevent cross-user access
        user_document_id = f"user_{current_user.id}_doc_{request.document_id}"
        
        # Embed the document
        success = faiss_rag_service.embed_document(
            text=request.document_text,
            document_id=user_document_id,
            metadata=metadata
        )
        
        if success:
            # Get stats to return chunk count
            stats = faiss_rag_service.get_document_stats(user_document_id)
            chunk_count = stats.get("chunk_count", 0) if "error" not in stats else 0
            
            return EmbedDocumentResponse(
                success=True,
                document_id=request.document_id,  # Return original ID
                message="Document embedded successfully",
                chunk_count=chunk_count
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to embed document")
            
    except Exception as e:
        logger.error(f"Error embedding document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to embed document: {str(e)}")

@router.post("/ask", response_model=AskQuestionResponse)
async def ask_question(
    request: AskQuestionRequest,
    current_user: User = Depends(get_current_user),
    _=Depends(require_within_ai_query_quota)
):
    """
    Ask a question about an embedded document
    """
    try:
        logger.info(f"[RAG] /ask received user={current_user.id} doc={request.document_id} qlen={len(request.question or '')}")
        user_document_id = f"user_{current_user.id}_doc_{request.document_id}"
        
        # Ask the question
        result = faiss_rag_service.ask_question(
            question=request.question,
            document_id=user_document_id,
            conversation_history=request.conversation_history
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        # increment usage
        await usage_service.increment(current_user.id, 'ai_queries', 1)
        logger.info(f"[RAG] /ask sending answer len={len(result.get('answer',''))} sources={len(result.get('sources',[]))}")
        
        return AskQuestionResponse(
            answer=result["answer"],
            sources=result["sources"],
            document_id=request.document_id,  # Return original ID
            question=request.question
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RAG] /ask error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")

@router.get("/documents")
async def list_documents(current_user: User = Depends(get_current_user)):
    """
    List all documents that have been embedded for the current user
    """
    try:
        all_documents = faiss_rag_service.list_documents()
        
        # Filter to only show user's documents
        user_prefix = f"user_{current_user.id}_doc_"
        user_documents = []
        
        for doc_id in all_documents:
            if doc_id.startswith(user_prefix):
                # Remove the user prefix to get original document ID
                original_id = doc_id[len(user_prefix):]
                user_documents.append(original_id)
        
        return {"documents": user_documents}
        
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@router.get("/documents/{document_id}/stats", response_model=DocumentStatsResponse)
async def get_document_stats(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about a document's embeddings
    """
    try:
        # Use user-specific document ID
        user_document_id = f"user_{current_user.id}_doc_{document_id}"
        
        stats = faiss_rag_service.get_document_stats(user_document_id)
        
        if "error" in stats:
            raise HTTPException(status_code=404, detail=stats["error"])
        
        return DocumentStatsResponse(
            document_id=document_id,  # Return original ID
            chunk_count=stats["chunk_count"],
            metadata=stats["metadata"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get document stats: {str(e)}")

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete all embeddings for a specific document
    """
    try:
        # Use user-specific document ID
        user_document_id = f"user_{current_user.id}_doc_{document_id}"
        
        success = faiss_rag_service.delete_document_embeddings(user_document_id)
        
        if success:
            return {"message": f"Document {document_id} deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete document")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

# Book-specific endpoints for integration with the book system

@router.post("/books/{book_id}/embed")
async def embed_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Embed a book from the database for RAG queries
    """
    try:
        # Get the book
        book_service = BookService(db)
        book = await book_service.get_book_by_id(book_id)
        
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Check if user owns the book
        if book.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this book")
        
        # Ensure book content is available; if not, process on-demand
        if not book.is_processed or not book.text_content:
            try:
                print(f"[RAG] Book {book_id} not processed or empty content. Processing now...")
                _ = await book_service.get_book_content(book_id, current_user.id)
                # Re-fetch to get updated fields
                book = await book_service.get_book_by_id(book_id)
                print(f"[RAG] Processing complete. is_processed={book.is_processed}, text_len={len(book.text_content or '')}")
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to prepare book content: {e}")
        
        if not book.text_content:
            raise HTTPException(status_code=400, detail="Book content not available")
        
        # Prepare metadata
        metadata = {
            "book_id": book.id,
            "title": book.title,
            "author": book.author,
            "created_at": book.created_at.isoformat(),
            "file_type": book.file_type.value,
            "user_id": current_user.id
        }
        
        if book.description:
            metadata["description"] = book.description
        
        # Use book-specific document ID
        document_id = f"user_{current_user.id}_book_{book_id}"
        
        # Embed the book content
        success = faiss_rag_service.embed_document(
            text=book.text_content,
            document_id=document_id,
            metadata=metadata
        )
        
        if success:
            # Get stats
            stats = faiss_rag_service.get_document_stats(document_id)
            chunk_count = stats.get("chunk_count", 0) if "error" not in stats else 0
            
            return {
                "success": True,
                "book_id": book_id,
                "title": book.title,
                "message": "Book embedded successfully",
                "chunk_count": chunk_count
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to embed book")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error embedding book {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to embed book: {str(e)}")

@router.post("/books/{book_id}/ask")
async def ask_question_about_book(
    book_id: int,
    request: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_within_ai_query_quota)
):
    """
    Ask a question about a specific book
    """
    try:
        question = request.get("question")
        conversation_history = request.get("conversation_history", [])
        logger.info(f"[RAG] /books/{book_id}/ask received user={current_user.id} qlen={len(question or '')} hist={len(conversation_history)}")
        if not question:
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Get the book for metadata
        book_service = BookService(db)
        book = await book_service.get_book_by_id(book_id)
        
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Check if user owns the book
        if book.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this book")
        
        # Use book-specific document ID
        document_id = f"user_{current_user.id}_book_{book_id}"
        
        # Ask the question
        result = faiss_rag_service.ask_question(
            question=question,
            document_id=document_id,
            conversation_history=conversation_history
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        # increment usage
        await usage_service.increment(current_user.id, 'ai_queries', 1)
        result["book"] = {"id": book.id, "title": book.title, "author": book.author}
        logger.info(f"[RAG] /books/{book_id}/ask sending answer len={len(result.get('answer',''))} sources={len(result.get('sources',[]))}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RAG] Error asking question about book {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")

@router.get("/books/{book_id}/stats")
async def get_book_stats(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about a book's embeddings
    """
    try:
        # Get the book to verify ownership
        book_service = BookService(db)
        book = await book_service.get_book_by_id(book_id)
        
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Check if user owns the book
        if book.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this book")
        
        # Use book-specific document ID
        document_id = f"user_{current_user.id}_book_{book_id}"
        
        stats = faiss_rag_service.get_document_stats(document_id)
        
        if "error" in stats:
            return {
                "book_id": book_id,
                "chunk_count": 0,
                "metadata": {},
                "error": stats["error"],
                "is_embedded": False
            }
        
        return {
            "book_id": book_id,
            "chunk_count": stats["chunk_count"],
            "metadata": stats["metadata"],
            "is_embedded": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting book stats for book {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get book stats: {str(e)}") 