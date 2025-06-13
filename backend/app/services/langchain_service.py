import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import uuid

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.vectorstores.faiss import FAISS
from langchain.chains import RetrievalQA
from langchain.schema import Document
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.chains.conversational_retrieval.base import ConversationalRetrievalChain
import pickle
import os

from app.core.config import settings

logger = logging.getLogger(__name__)

class LangChainRAGService:
    """
    LangChain-based RAG service using ChromaDB for vector storage and OpenAI for embeddings/chat
    """
    
    def __init__(self):
        self.embeddings = None
        self.vector_store = None
        self.chat_model = None
        self.text_splitter = None
        self.initialized = False
        
    def initialize(self) -> bool:
        """Initialize the LangChain RAG service"""
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
            
            # Initialize text splitter
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
                length_function=len,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            # Ensure FAISS directory exists
            faiss_path = Path(settings.VECTOR_DB_PATH)
            faiss_path.mkdir(exist_ok=True)
            
            self.initialized = True
            logger.info("LangChain RAG service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize LangChain RAG service: {str(e)}")
            self.initialized = False
            return False
    
    def _get_collection_name(self, document_id: str) -> str:
        """Generate a valid ChromaDB collection name from document ID"""
        # ChromaDB collection names must be alphanumeric + underscore/hyphen
        # and between 3-63 characters
        collection_name = f"doc_{document_id}".replace("-", "_")
        if len(collection_name) > 63:
            collection_name = collection_name[:63]
        return collection_name
    
    def embed_document(self, 
                      text: str, 
                      document_id: str, 
                      metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Embed a document and store it in ChromaDB
        
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
            # Validate input size
            if len(text) > 10_000_000:  # 10MB text limit
                logger.error("Document text too large")
                return False
                
            # Split the text into chunks
            documents = self.text_splitter.create_documents([text])
            
            # Add metadata to each chunk
            chunk_metadata = metadata or {}
            chunk_metadata.update({
                "document_id": document_id,
                "total_chunks": len(documents)
            })
            
            # Add chunk-specific metadata
            for i, doc in enumerate(documents):
                doc.metadata = {
                    **chunk_metadata,
                    "chunk_index": i,
                    "chunk_id": f"{document_id}_chunk_{i}"
                }
            
            # Get collection name
            collection_name = self._get_collection_name(document_id)
            
            # Create vector store for this document
            vector_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=settings.CHROMA_DB_PATH
            )
            
            # Add documents to vector store
            vector_store.add_documents(documents)
            
            logger.info(f"Successfully embedded {len(documents)} chunks for document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error embedding document {document_id}: {str(e)}")
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
            # Get collection name
            collection_name = self._get_collection_name(document_id)
            
            # Connect to the document's vector store
            vector_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=settings.CHROMA_DB_PATH
            )
            
            # Check if collection exists and has documents
            collection = vector_store._collection
            if collection.count() == 0:
                return {"error": f"No embeddings found for document {document_id}"}
            
            # Create retriever
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 4}  # Retrieve top 4 most relevant chunks
            )
            
            # Create custom prompt template
            prompt_template = """Use the following pieces of context to answer the question at the end. If you don't know the answer based on the context provided, just say that you don't know, don't try to make up an answer.

Context:
{context}

Question: {question}

Answer: """
            
            PROMPT = PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question"]
            )
            
            # Create QA chain
            if conversation_history:
                # Use conversational retrieval chain for follow-up questions
                memory = ConversationBufferMemory(
                    memory_key="chat_history",
                    return_messages=True
                )
                
                # Add conversation history to memory
                for msg in conversation_history:
                    if msg.get("role") == "user":
                        memory.chat_memory.add_user_message(msg["content"])
                    elif msg.get("role") == "assistant":
                        memory.chat_memory.add_ai_message(msg["content"])
                
                qa_chain = ConversationalRetrievalChain.from_llm(
                    llm=self.chat_model,
                    retriever=retriever,
                    memory=memory,
                    return_source_documents=True,
                    combine_docs_chain_kwargs={"prompt": PROMPT}
                )
                
                result = qa_chain({"question": question})
            else:
                # Use simple QA chain for standalone questions
                qa_chain = RetrievalQA.from_chain_type(
                    llm=self.chat_model,
                    chain_type="stuff",
                    retriever=retriever,
                    return_source_documents=True,
                    chain_type_kwargs={"prompt": PROMPT}
                )
                
                result = qa_chain({"query": question})
            
            # Extract sources information
            sources = []
            if "source_documents" in result:
                for doc in result["source_documents"]:
                    sources.append({
                        "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                        "metadata": doc.metadata
                    })
            
            # Get answer
            answer = result.get("answer") or result.get("result", "I couldn't generate an answer.")
            
            return {
                "answer": answer,
                "sources": sources,
                "document_id": document_id,
                "question": question
            }
            
        except Exception as e:
            logger.error(f"Error asking question about document {document_id}: {str(e)}")
            return {"error": f"Failed to process question: {str(e)}"}
    
    def delete_document_embeddings(self, document_id: str) -> bool:
        """
        Delete all embeddings for a specific document
        
        Args:
            document_id: The document ID to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            collection_name = self._get_collection_name(document_id)
            
            # Connect to ChromaDB and delete the collection
            vector_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=settings.CHROMA_DB_PATH
            )
            
            # Delete the entire collection
            vector_store.delete_collection()
            
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
            from chromadb import PersistentClient
            
            client = PersistentClient(path=settings.CHROMA_DB_PATH)
            collections = client.list_collections()
            
            # Extract document IDs from collection names
            document_ids = []
            for collection in collections:
                if collection.name.startswith("doc_"):
                    doc_id = collection.name[4:]  # Remove "doc_" prefix
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
            collection_name = self._get_collection_name(document_id)
            
            vector_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=settings.CHROMA_DB_PATH
            )
            
            collection = vector_store._collection
            count = collection.count()
            
            if count == 0:
                return {"error": f"No embeddings found for document {document_id}"}
                
            # Get sample metadata
            sample_result = collection.peek(limit=1)
            metadata = sample_result["metadatas"][0] if sample_result["metadatas"] else {}
            
            return {
                "document_id": document_id,
                "chunk_count": count,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"Error getting stats for document {document_id}: {str(e)}")
            return {"error": f"Failed to get document stats: {str(e)}"}


# Create a global instance
langchain_service = LangChainRAGService() 