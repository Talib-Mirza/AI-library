import os
import tempfile
from typing import List, Optional
from datetime import datetime

import fitz  # PyMuPDF
from langchain.document_loaders import TextLoader, PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from fastapi import UploadFile

from app.core.config import settings
from app.models.book import Book, FileType


class BookProcessor:
    """
    Service for processing book files, extracting text, and creating vector embeddings.
    """
    
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.GOOGLE_API_KEY
        )
    
    async def process_book(self, book: Book) -> None:
        """
        Process a book to extract text and generate embeddings.
        
        Args:
            book: Book object to process
            
        Returns:
            None
        """
        try:
            # Extract text from the book file
            text = await self._extract_text(book.file_path, book.file_type)
            
            # Store the extracted text in the book model
            book.text_content = text
            
            # Create a directory for this book's vector store
            book_vector_dir = os.path.join(settings.VECTOR_DB_PATH, str(book.id))
            os.makedirs(book_vector_dir, exist_ok=True)
            
            # Split text into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            chunks = text_splitter.split_text(text)
            
            # Create document objects with metadata
            documents = [
                {"page_content": chunk, "metadata": {"book_id": book.id, "chunk_id": i}}
                for i, chunk in enumerate(chunks)
            ]
            
            # Create vector store
            vectorstore = Chroma.from_documents(
                documents=documents,
                embedding=self.embeddings,
                persist_directory=book_vector_dir
            )
            vectorstore.persist()
            
            # Update book status
            book.is_processed = True
            book.page_count = await self._get_page_count(book.file_path, book.file_type)
            
        except Exception as e:
            # Log the error and update book status
            print(f"Error processing book: {str(e)}")
            book.is_processed = False
            book.processing_error = str(e)
    
    async def _extract_text(self, file_path: str, file_type: FileType) -> str:
        """
        Extract text from a book file.
        
        Args:
            file_path: Path to the book file
            file_type: Type of the file
            
        Returns:
            Extracted text
        """
        if file_type == FileType.PDF:
            loader = PyMuPDFLoader(file_path)
            documents = loader.load()
            return " ".join([doc.page_content for doc in documents])
        
        elif file_type == FileType.TXT:
            loader = TextLoader(file_path)
            documents = loader.load()
            return " ".join([doc.page_content for doc in documents])
        
        elif file_type == FileType.EPUB:
            # PyMuPDF can handle EPUB files as well
            loader = PyMuPDFLoader(file_path)
            documents = loader.load()
            return " ".join([doc.page_content for doc in documents])
        
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    async def _get_page_count(self, file_path: str, file_type: FileType) -> int:
        """
        Get the number of pages in a book file.
        
        Args:
            file_path: Path to the book file
            file_type: Type of the file
            
        Returns:
            Number of pages
        """
        if file_type in [FileType.PDF, FileType.EPUB]:
            doc = fitz.open(file_path)
            count = len(doc)
            doc.close()
            return count
        
        elif file_type == FileType.TXT:
            # For text files, count the number of lines and divide by 40 (approximate)
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            return max(1, len(lines) // 40)
        
        else:
            return 0
    
    @staticmethod
    async def save_upload_file(file: UploadFile, content: bytes) -> str:
        """
        Save an uploaded file to disk.
        
        Args:
            file: The uploaded file
            content: The file content
            
        Returns:
            The path where the file is saved
        """
        # Create upload directory if it doesn't exist
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Generate a unique filename based on timestamp and original filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_filename = os.path.splitext(file.filename)[0]
        file_ext = os.path.splitext(file.filename)[1].lower()
        safe_filename = f"{timestamp}_{original_filename}{file_ext}"
        
        # Ensure the filename is safe for all operating systems
        safe_filename = "".join(c for c in safe_filename if c.isalnum() or c in "._- ")
        file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        
        # Write content to file
        with open(file_path, "wb") as f:
            f.write(content)
        
        return file_path 