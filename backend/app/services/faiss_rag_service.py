import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import pickle
import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from app.core.config import settings

# Add direct OpenAI import for fallback
try:
    import openai
    DIRECT_OPENAI_AVAILABLE = True
except ImportError:
    DIRECT_OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

class FAISSRAGService:
    """
    LangChain-based RAG service using FAISS for vector storage and OpenAI for embeddings/chat
    """
    
    def __init__(self):
        self.embeddings = None
        self.chat_model = None
        self.text_splitter = None
        self.initialized = False
        self.vector_stores = {}  # Cache for loaded vector stores
        
    def initialize(self) -> bool:
        """Initialize the FAISS RAG service"""
        try:
            if self.initialized:
                return True
                
            # Check if OpenAI API key is available
            if not settings.OPENAI_API_KEY:
                logger.error("OpenAI API key not found in settings")
                return False
                
            # Initialize OpenAI embeddings
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=settings.OPENAI_API_KEY,
                model="text-embedding-3-small"  # Fast and cost-effective
            )
            
            # Initialize chat model
            self.chat_model = ChatOpenAI(
                openai_api_key=settings.OPENAI_API_KEY,
                model="gpt-4o-mini",  # Cost-effective but capable
                temperature=0,
                max_tokens=1000
            )
            
            # Configure text splitter
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            self.initialized = True
            logger.info("FAISS RAG service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize FAISS RAG service: {str(e)}")
            self.initialized = False
            return False
    
    def _get_vector_store_path(self, document_id: str) -> Path:
        """Get the file path for a document's vector store"""
        # Check if this is a book embedding (format: user_{user_id}_book_{book_id})
        if "_book_" in document_id and document_id.startswith("user_"):
            # Extract user_id and book_id from document_id
            # Format: user_{user_id}_book_{book_id}
            parts = document_id.split("_")
            if len(parts) >= 4 and parts[0] == "user" and parts[2] == "book":
                user_id = parts[1]
                book_id = parts[3]
                
                # Store embeddings directly in the book_id directory alongside content.json and metadata.json
                # This creates: uploads/{user_id}/{book_id}/embeddings/
                return Path(settings.UPLOAD_DIR) / user_id / book_id / "embeddings"
        
        # For non-book documents, use the old vector_db directory
        return Path(settings.VECTOR_DB_PATH) / f"faiss_{document_id}"
    
    def _save_vector_store(self, vector_store: FAISS, document_id: str) -> None:
        """Save a vector store to disk"""
        try:
            store_path = self._get_vector_store_path(document_id)
            # Ensure the directory exists
            store_path.mkdir(parents=True, exist_ok=True)
            vector_store.save_local(str(store_path))
            logger.info(f"Saved vector store for document {document_id} to {store_path}")
        except Exception as e:
            logger.error(f"Failed to save vector store for document {document_id}: {str(e)}")
    
    def _load_vector_store(self, document_id: str) -> Optional[FAISS]:
        """Load a vector store from disk"""
        try:
            store_path = self._get_vector_store_path(document_id)
            if not store_path.exists():
                return None
                
            # Check if we have it cached
            if document_id in self.vector_stores:
                return self.vector_stores[document_id]
                
            # Load from disk
            vector_store = FAISS.load_local(
                str(store_path), 
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            
            # Cache it
            self.vector_stores[document_id] = vector_store
            logger.info(f"Loaded vector store for document {document_id}")
            return vector_store
            
        except Exception as e:
            logger.error(f"Failed to load vector store for document {document_id}: {str(e)}")
            return None
    
    def embed_document(self, 
                      text: str, 
                      document_id: str, 
                      metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Embed a document and store it in FAISS
        
        Args:
            text: The document text to embed
            document_id: Unique identifier for the document
            metadata: Additional metadata to store with the document
            
        Returns:
            True if successful, False otherwise
        """
        if not self.initialize():
            logger.error("Cannot embed document: Service not initialized")
            return False
            
        try:
            logger.info(f"Starting to embed document {document_id}")
            # Validate input size
            if len(text) > 10_000_000:  # 10MB text limit
                logger.error("Document text too large")
                return False
                
            # Split the text into chunks
            logger.info(f"Splitting text into chunks for document {document_id}")
            documents = self.text_splitter.create_documents([text])
            logger.info(f"Created {len(documents)} chunks for document {document_id}")
            
            # Add metadata to each chunk and ensure proper Document structure
            chunk_metadata = metadata or {}
            chunk_metadata.update({
                "document_id": document_id,
                "total_chunks": len(documents)
            })
            
            # Create proper Document objects with IDs
            processed_documents = []
            for i, doc in enumerate(documents):
                # Create a new Document with proper metadata and ID
                chunk_id = f"{document_id}_chunk_{i}"
                new_doc = Document(
                    page_content=doc.page_content,
                    metadata={
                        **chunk_metadata,
                        "chunk_index": i,
                        "chunk_id": chunk_id
                    },
                    id=chunk_id
                )
                processed_documents.append(new_doc)
                logger.debug(f"Created document chunk {i} with ID: {chunk_id}")
            
            # Create vector store using texts and metadatas approach (more compatible)
            logger.info(f"Creating vector store for document {document_id}")
            try:
                # Extract texts and metadatas for FAISS creation
                texts = [doc.page_content for doc in processed_documents]
                metadatas = [doc.metadata for doc in processed_documents]
                
                logger.info(f"Creating FAISS index with {len(texts)} texts")
                vector_store = FAISS.from_texts(
                    texts=texts,
                    embedding=self.embeddings,
                    metadatas=metadatas
                )
                logger.info(f"Successfully created vector store for document {document_id}")
            except Exception as vs_error:
                logger.error(f"Error creating vector store for document {document_id}: {str(vs_error)}", exc_info=True)
                logger.error(f"Texts count: {len(texts) if 'texts' in locals() else 'N/A'}")
                logger.error(f"Sample text: {texts[0][:100] if 'texts' in locals() and texts else 'No texts'}")
                logger.error(f"Sample metadata: {metadatas[0] if 'metadatas' in locals() and metadatas else 'No metadata'}")
                raise
            
            # Save to disk
            logger.info(f"Saving vector store for document {document_id}")
            self._save_vector_store(vector_store, document_id)
            
            # Cache it
            self.vector_stores[document_id] = vector_store
            
            logger.info(f"Successfully embedded {len(documents)} chunks for document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error embedding document {document_id}: {str(e)}", exc_info=True)
            return False
    
    def ask_question(self, 
                    question: str, 
                    document_id: str, 
                    conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Ask a question about a specific document using RAG
        
        Args:
            question: The question to ask
            document_id: The document to query
            conversation_history: Optional conversation history for context
            
        Returns:
            Dictionary containing answer, sources, and metadata
        """
        if not self.initialize():
            logger.error("Cannot ask question: Service not initialized")
            return {"error": "Service not initialized"}
            
        try:
            # Load the vector store
            vector_store = self._load_vector_store(document_id)
            if not vector_store:
                return {"error": f"No embeddings found for document {document_id}"}
            
            # Create retriever
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 4}  # Retrieve top 4 most relevant chunks
            )
            
            # Use modern LCEL approach for better compatibility
            try:
                # Get relevant documents
                docs = retriever.get_relevant_documents(question)
                
                if not docs:
                    return {"error": "No relevant documents found for the question"}
                
                # Prepare context from retrieved documents (be careful with metadata)
                context_parts = []
                safe_sources = []
                
                for doc in docs:
                    context_parts.append(doc.page_content)
                    
                    # Safely handle metadata to avoid FieldInfo issues
                    safe_metadata = {}
                    if hasattr(doc, 'metadata') and doc.metadata:
                        try:
                            # Only include serializable metadata
                            for key, value in doc.metadata.items():
                                if isinstance(value, (str, int, float, bool)):
                                    safe_metadata[key] = value
                                else:
                                    safe_metadata[key] = str(value)
                        except Exception:
                            safe_metadata = {"error": "metadata_serialization_failed"}
                    
                    safe_sources.append({
                        "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                        "metadata": safe_metadata
                    })
                
                context = "\n\n".join(context_parts)
                
                # Create a simple prompt string directly (avoid PromptTemplate issues)
                simple_prompt = f"""Use the following pieces of context to answer the question at the end. If you don't know the answer based on the context provided, just say that you don't know, don't try to make up an answer.

Context:
{context}

Question: {question}

Answer:"""
                
                # Get answer from chat model using invoke method
                try:
                    answer = self.chat_model.invoke(simple_prompt).content
                except Exception as invoke_error:
                    logger.warning(f"Invoke method failed, trying predict: {invoke_error}")
                    answer = self.chat_model.predict(simple_prompt)
                
                return {
                    "answer": answer,
                    "sources": safe_sources,
                    "document_id": document_id,
                    "question": question
                }
                
            except Exception as chain_error:
                logger.error(f"Error in modern chain approach: {str(chain_error)}")
                
                # Ultra-simple fallback approach
                try:
                    # Direct retrieval without complex formatting
                    docs = retriever.get_relevant_documents(question)
                    if not docs:
                        return {"error": "No relevant documents found"}
                    
                    # Use only the first document for simplicity
                    first_doc = docs[0]
                    simple_context = first_doc.page_content[:500]  # Limit context length
                    
                    # Very basic prompt
                    basic_prompt = f"Based on this text: {simple_context}\n\nQuestion: {question}\n\nAnswer:"
                    
                    # Try invoke first, then predict
                    try:
                        answer = self.chat_model.invoke(basic_prompt).content
                    except Exception:
                        answer = self.chat_model.predict(basic_prompt)
                    
                    return {
                        "answer": answer,
                        "sources": [{
                            "content": first_doc.page_content[:200] + "..." if len(first_doc.page_content) > 200 else first_doc.page_content,
                            "metadata": {"source": "fallback"}
                        }],
                        "document_id": document_id,
                        "question": question
                    }
                    
                except Exception as fallback_error:
                    logger.error(f"Even fallback failed: {str(fallback_error)}")
                    
                    # Final fallback: direct OpenAI API call
                    if DIRECT_OPENAI_AVAILABLE:
                        try:
                            logger.info("Trying direct OpenAI API as final fallback")
                            return self._direct_openai_query(question, document_id, retriever)
                        except Exception as direct_error:
                            logger.error(f"Direct OpenAI also failed: {str(direct_error)}")
                    
                    return {"error": f"All approaches failed: {str(fallback_error)}"}
            
        except Exception as e:
            logger.error(f"Error asking question about document {document_id}: {str(e)}")
            return {"error": f"Failed to process question: {str(e)}"}
    
    def _direct_openai_query(self, question: str, document_id: str, retriever) -> Dict[str, Any]:
        """
        Direct OpenAI API call bypassing all LangChain components
        """
        try:
            # Get documents using retriever
            docs = retriever.get_relevant_documents(question)
            if not docs:
                return {"error": "No relevant documents found"}
            
            # Prepare context
            context = docs[0].page_content[:1000]  # Limit to avoid token issues
            
            # Prepare messages for OpenAI chat completion
            messages = [
                {
                    "role": "system", 
                    "content": "You are a helpful assistant that answers questions based on the provided context. If you don't know the answer based on the context, say so."
                },
                {
                    "role": "user", 
                    "content": f"Context: {context}\n\nQuestion: {question}\n\nAnswer:"
                }
            ]
            
            # Direct OpenAI API call
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content
            
            return {
                "answer": answer,
                "sources": [{
                    "content": docs[0].page_content[:200] + "..." if len(docs[0].page_content) > 200 else docs[0].page_content,
                    "metadata": {"source": "direct_openai_fallback"}
                }],
                "document_id": document_id,
                "question": question
            }
            
        except Exception as e:
            logger.error(f"Direct OpenAI query failed: {str(e)}")
            return {"error": f"Direct OpenAI failed: {str(e)}"}
    
    def delete_document_embeddings(self, document_id: str) -> bool:
        """
        Delete all embeddings for a specific document
        
        Args:
            document_id: The document ID to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            store_path = self._get_vector_store_path(document_id)
            
            # Remove from cache
            if document_id in self.vector_stores:
                del self.vector_stores[document_id]
            
            # Delete files from disk
            if store_path.exists():
                import shutil
                shutil.rmtree(store_path)
            
            logger.info(f"Successfully deleted embeddings for document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting embeddings for document {document_id}: {str(e)}")
            return False
    
    def list_documents(self) -> List[str]:
        """
        List all document IDs that have embeddings
        
        Returns:
            List of document IDs
        """
        try:
            document_ids = []
            
            # Check old vector_db directory for non-book documents
            vector_db_path = Path(settings.VECTOR_DB_PATH)
            if vector_db_path.exists():
                for item in vector_db_path.iterdir():
                    if item.is_dir() and item.name.startswith("faiss_"):
                        doc_id = item.name[6:]  # Remove "faiss_" prefix
                        document_ids.append(doc_id)
            
            # Check uploads directory for book embeddings using book_id structure
            uploads_path = Path(settings.UPLOAD_DIR)
            if uploads_path.exists():
                try:
                    from app.models.book import Book
                    from app.core.database import SessionLocal
                    
                    with SessionLocal() as db:
                        # Get all books to check their book_id directories
                        books = db.query(Book).all()
                        for book in books:
                            embeddings_path = uploads_path / str(book.user_id) / str(book.id) / "embeddings"
                            if embeddings_path.exists() and (embeddings_path / "index.faiss").exists():
                                # Reconstruct the document_id format
                                doc_id = f"user_{book.user_id}_book_{book.id}"
                                document_ids.append(doc_id)
                except Exception as e:
                    logger.error(f"Error checking book embeddings: {str(e)}")
                    # Fallback: manually check directory structure
                    for user_dir in uploads_path.iterdir():
                        if user_dir.is_dir() and user_dir.name.isdigit():  # user_id directories
                            for book_dir in user_dir.iterdir():
                                if book_dir.is_dir() and book_dir.name.isdigit():  # book_id directories
                                    embeddings_path = book_dir / "embeddings"
                                    if embeddings_path.exists() and (embeddings_path / "index.faiss").exists():
                                        # Reconstruct document_id from directory structure
                                        user_id = user_dir.name
                                        book_id = book_dir.name
                                        doc_id = f"user_{user_id}_book_{book_id}"
                                        document_ids.append(doc_id)
            
            return document_ids
            
        except Exception as e:
            logger.error(f"Error listing documents: {str(e)}")
            return []
    
    def get_document_stats(self, document_id: str) -> Dict[str, Any]:
        """
        Get statistics about a document's embeddings
        
        Args:
            document_id: The document ID
            
        Returns:
            Dictionary with document statistics
        """
        try:
            logger.info(f"Getting stats for document {document_id}")
            vector_store = self._load_vector_store(document_id)
            if not vector_store:
                logger.warning(f"No vector store found for document {document_id}")
                return {"error": f"No embeddings found for document {document_id}"}
            
            # Get the number of documents in the vector store
            # This is a bit hacky but FAISS doesn't expose this directly
            chunk_count = vector_store.index.ntotal
            logger.info(f"Document {document_id} has {chunk_count} chunks")
            
            # Get sample metadata if available
            metadata = {}
            try:
                if hasattr(vector_store, 'docstore') and vector_store.docstore._dict:
                    # Get first document's metadata
                    first_doc_key = next(iter(vector_store.docstore._dict.keys()))
                    first_doc = vector_store.docstore._dict[first_doc_key]
                    logger.info(f"First document type: {type(first_doc)}")
                    logger.info(f"First document attributes: {dir(first_doc)}")
                    
                    if hasattr(first_doc, 'metadata'):
                        metadata = first_doc.metadata
                        logger.info(f"Got metadata: {metadata}")
                    else:
                        logger.warning("First document has no metadata attribute")
                else:
                    logger.warning("Vector store has no docstore or docstore is empty")
            except Exception as meta_error:
                logger.error(f"Error getting metadata for document {document_id}: {str(meta_error)}")
                # Continue without metadata
            
            result = {
                "document_id": document_id,
                "chunk_count": chunk_count,
                "metadata": metadata
            }
            logger.info(f"Returning stats for document {document_id}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting stats for document {document_id}: {str(e)}", exc_info=True)
            return {"error": f"Failed to get document stats: {str(e)}"}


# Create a global instance
faiss_rag_service = FAISSRAGService() 