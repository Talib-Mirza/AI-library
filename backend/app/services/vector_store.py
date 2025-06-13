import os
import logging
from typing import List, Optional, Dict, Any
import weaviate
from weaviate.util import get_valid_uuid
from uuid import uuid4

from app.core.config import settings

logger = logging.getLogger(__name__)

class WeaviateService:
    """Service for interacting with Weaviate vector database"""
    
    def __init__(self):
        self.client = None
        self.initialized = False
        self.index_name = "BookContent"
        
    def initialize(self) -> bool:
        """Initialize connection to Weaviate"""
        try:
            if self.initialized:
                return True
                
            # Get configuration from environment
            url = settings.WEAVIATE_URL
            api_key = settings.WEAVIATE_API_KEY
            
            # If no URL is provided, Weaviate is not configured
            if not url:
                logger.warning("Weaviate URL not configured. Vector search disabled.")
                return False
                
            # Setup auth if API key is provided
            auth = weaviate.auth.AuthApiKey(api_key=api_key) if api_key else None
            
            # Initialize Weaviate client
            self.client = weaviate.Client(url=url, auth_client_secret=auth)
            
            # Check if schema exists, if not create it
            self._ensure_schema_exists()
            
            self.initialized = True
            logger.info("Weaviate client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Weaviate client: {str(e)}")
            self.initialized = False
            return False
            
    def _ensure_schema_exists(self) -> None:
        """Create schema if it doesn't exist"""
        if not self.client.schema.exists(self.index_name):
            schema = {
                "class": self.index_name,
                "description": "Book content for semantic search",
                "vectorizer": "text2vec-transformers",  # You can change this to your preferred vectorizer
                "properties": [
                    {
                        "name": "content",
                        "dataType": ["text"],
                        "description": "The text content",
                        "indexInverted": True
                    },
                    {
                        "name": "page",
                        "dataType": ["int"],
                        "description": "Page number in the book",
                    },
                    {
                        "name": "bookId",
                        "dataType": ["int"],
                        "description": "ID of the book this content belongs to",
                        "indexInverted": True
                    },
                    {
                        "name": "userId",
                        "dataType": ["string"],
                        "description": "ID of the user who owns the book",
                        "indexInverted": True
                    },
                    {
                        "name": "title",
                        "dataType": ["string"],
                        "description": "Title of the book",
                        "indexInverted": True
                    },
                    {
                        "name": "author",
                        "dataType": ["string"],
                        "description": "Author of the book",
                        "indexInverted": True
                    }
                ]
            }
            self.client.schema.create_class(schema)
            logger.info(f"Created schema for {self.index_name}")
    
    def add_document(self, 
                    content: str, 
                    book_id: int, 
                    user_id: str, 
                    page: int = 0, 
                    title: str = "", 
                    author: str = "",
                    chunk_id: Optional[str] = None) -> Optional[str]:
        """
        Add a document chunk to the vector store
        Returns the ID of the added object or None if failed
        """
        if not self.initialize():
            logger.warning("Cannot add document: Weaviate not initialized")
            return None
            
        try:
            # Properties to store
            data_object = {
                "content": content,
                "page": page,
                "bookId": book_id,
                "userId": user_id,
                "title": title,
                "author": author
            }
            
            # Generate deterministic ID if needed or use provided one
            _id = chunk_id or get_valid_uuid(uuid4())
            
            # Add to Weaviate
            self.client.data_object.create(
                data_object=data_object,
                class_name=self.index_name,
                uuid=_id
            )
            
            return _id
            
        except Exception as e:
            logger.error(f"Error adding document to Weaviate: {str(e)}")
            return None
    
    def delete_document(self, id: str) -> bool:
        """Delete a document from the vector store by ID"""
        if not self.initialize():
            return False
            
        try:
            self.client.data_object.delete(uuid=id, class_name=self.index_name)
            return True
        except Exception as e:
            logger.error(f"Error deleting document from Weaviate: {str(e)}")
            return False
    
    def delete_book_documents(self, book_id: int) -> bool:
        """Delete all documents for a particular book"""
        if not self.initialize():
            return False
            
        try:
            # Use a batch process to delete all entries for a book
            result = self.client.batch.delete_objects(
                class_name=self.index_name,
                where={
                    "path": ["bookId"],
                    "operator": "Equal",
                    "valueNumber": book_id
                }
            )
            return True
        except Exception as e:
            logger.error(f"Error deleting book documents from Weaviate: {str(e)}")
            return False
    
    def search(self, 
              query: str, 
              user_id: Optional[str] = None, 
              book_id: Optional[int] = None, 
              limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents matching the query
        
        Args:
            query: The search query
            user_id: Optional filter for user's documents only
            book_id: Optional filter for specific book
            limit: Maximum number of results
            
        Returns:
            List of matching documents with score and metadata
        """
        if not self.initialize():
            return []
            
        try:
            # Build where filter if needed
            where_filter = None
            
            if user_id and book_id:
                where_filter = {
                    "operator": "And",
                    "operands": [
                        {
                            "path": ["userId"],
                            "operator": "Equal",
                            "valueString": user_id
                        },
                        {
                            "path": ["bookId"],
                            "operator": "Equal",
                            "valueNumber": book_id
                        }
                    ]
                }
            elif user_id:
                where_filter = {
                    "path": ["userId"],
                    "operator": "Equal",
                    "valueString": user_id
                }
            elif book_id:
                where_filter = {
                    "path": ["bookId"],
                    "operator": "Equal",
                    "valueNumber": book_id
                }
                
            # Execute semantic search
            result = (
                self.client.query
                .get(self.index_name, ["content", "page", "bookId", "userId", "title", "author", "_additional {certainty}"])
                .with_near_text({"concepts": [query]})
                .with_where(where_filter) if where_filter else self.client.query.get(self.index_name, ["content", "page", "bookId", "userId", "title", "author", "_additional {certainty}"]).with_near_text({"concepts": [query]})
                .with_limit(limit)
                .do()
            )
            
            # Process results
            if "data" in result and "Get" in result["data"] and self.index_name in result["data"]["Get"]:
                return result["data"]["Get"][self.index_name]
            
            return []
            
        except Exception as e:
            logger.error(f"Error searching Weaviate: {str(e)}")
            return []

# Create a singleton instance
vector_store = WeaviateService() 