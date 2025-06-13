from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.vector_store import vector_store

router = APIRouter()

class SearchResult(BaseModel):
    content: str
    page: int
    bookId: int
    title: str
    author: str
    relevance: float

class SearchResponse(BaseModel):
    results: List[SearchResult]

@router.get("/semantic", response_model=SearchResponse)
async def semantic_search(
    query: str = Query(..., description="Search query text"),
    book_id: Optional[int] = Query(None, description="Filter by book ID"),
    limit: int = Query(5, description="Maximum number of results to return"),
    current_user: User = Depends(get_current_user)
):
    """
    Perform semantic search across book content using Weaviate vector database.
    
    This endpoint allows users to search through all of their books,
    or filter the search to a specific book by providing the book_id parameter.
    """
    try:
        # Search with user filtering (only show results from user's own books)
        raw_results = vector_store.search(
            query=query,
            user_id=current_user.id,
            book_id=book_id,
            limit=limit
        )
        
        # Transform results to the expected model
        results = []
        for item in raw_results:
            # Extract the certainty score
            certainty = item.get("_additional", {}).get("certainty", 0)
            
            results.append(SearchResult(
                content=item.get("content", ""),
                page=item.get("page", 0),
                bookId=item.get("bookId", 0),
                title=item.get("title", ""),
                author=item.get("author", ""),
                relevance=certainty
            ))
        
        return SearchResponse(results=results)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search error: {str(e)}"
        ) 