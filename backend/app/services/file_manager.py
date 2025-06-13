import os
import json
import gzip
import uuid
import shutil
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from datetime import datetime

from fastapi import UploadFile, HTTPException
from app.core.config import settings


class FileManager:
    """
    Service for managing file storage with organized directory structure:
    uploads/{user_id}/{pdf_id}/
    """
    
    def __init__(self):
        self.uploads_dir = Path(settings.UPLOAD_DIR)
        self.max_json_size = 5 * 1024 * 1024  # 5MB threshold for compression
        
    def generate_pdf_id(self) -> str:
        """Generate a unique PDF ID using UUID4."""
        return str(uuid.uuid4())
    
    def get_user_directory(self, user_id: int) -> Path:
        """Get the directory path for a specific user."""
        return self.uploads_dir / str(user_id)
    
    def get_pdf_directory(self, user_id: int, pdf_id: str) -> Path:
        """Get the directory path for a specific PDF."""
        return self.get_user_directory(user_id) / pdf_id
    
    def create_pdf_directory(self, user_id: int, pdf_id: str) -> Path:
        """Create directory structure for a new PDF upload."""
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        pdf_dir.mkdir(parents=True, exist_ok=True)
        return pdf_dir
    
    async def save_uploaded_file(
        self, 
        user_id: int, 
        pdf_id: str, 
        file: UploadFile, 
        file_content: bytes
    ) -> str:
        """
        Save uploaded file to organized directory structure.
        
        Args:
            user_id: User ID
            pdf_id: Unique PDF ID
            file: UploadFile object
            file_content: File content bytes
            
        Returns:
            Full file path where file was saved
        """
        # Create directory structure
        pdf_dir = self.create_pdf_directory(user_id, pdf_id)
        
        # Clean filename - keep original name but ensure it's safe
        original_name = file.filename or "document.pdf"
        safe_filename = self._sanitize_filename(original_name)
        
        # Save file
        file_path = pdf_dir / safe_filename
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return str(file_path)
    
    def save_processed_content(
        self, 
        user_id: int, 
        pdf_id: str, 
        content: Dict[str, Any]
    ) -> str:
        """
        Save processed PDF content as JSON, with compression if needed.
        
        Args:
            user_id: User ID
            pdf_id: PDF ID
            content: Processed content dictionary
            
        Returns:
            Path to saved content file
        """
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        
        # Serialize content
        content_json = json.dumps(content, indent=2, ensure_ascii=False)
        content_bytes = content_json.encode('utf-8')
        
        # Determine if compression is needed
        if len(content_bytes) > self.max_json_size:
            # Save compressed
            content_file = pdf_dir / "content.json.gz"
            with gzip.open(content_file, 'wt', encoding='utf-8') as f:
                f.write(content_json)
        else:
            # Save uncompressed
            content_file = pdf_dir / "content.json"
            with open(content_file, 'w', encoding='utf-8') as f:
                f.write(content_json)
        
        return str(content_file)
    
    def load_processed_content(self, user_id: int, pdf_id: str) -> Optional[Dict[str, Any]]:
        """
        Load processed content from cached JSON file.
        
        Args:
            user_id: User ID
            pdf_id: PDF ID
            
        Returns:
            Processed content dictionary or None if not found
        """
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        
        # Check for compressed version first
        compressed_file = pdf_dir / "content.json.gz"
        if compressed_file.exists():
            try:
                with gzip.open(compressed_file, 'rt', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading compressed content: {e}")
                return None
        
        # Check for uncompressed version
        uncompressed_file = pdf_dir / "content.json"
        if uncompressed_file.exists():
            try:
                with open(uncompressed_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading uncompressed content: {e}")
                return None
        
        return None
    
    def save_metadata(self, user_id: int, pdf_id: str, metadata: Dict[str, Any]) -> str:
        """
        Save PDF metadata to a separate JSON file.
        
        Args:
            user_id: User ID
            pdf_id: PDF ID
            metadata: Metadata dictionary
            
        Returns:
            Path to saved metadata file
        """
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        metadata_file = pdf_dir / "metadata.json"
        
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False, default=str)
        
        return str(metadata_file)
    
    def save_images(self, user_id: int, pdf_id: str, images: List[Dict]) -> str:
        """
        Save extracted images to the PDF directory.
        
        Args:
            user_id: User ID
            pdf_id: PDF ID
            images: List of image dictionaries
            
        Returns:
            Path to images directory
        """
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        images_dir = pdf_dir / "images"
        images_dir.mkdir(exist_ok=True)
        
        # Save images metadata
        images_file = images_dir / "images.json"
        with open(images_file, 'w', encoding='utf-8') as f:
            json.dump(images, f, indent=2, ensure_ascii=False)
        
        return str(images_dir)
    
    def get_original_file_path(self, user_id: int, pdf_id: str) -> Optional[str]:
        """
        Get the path to the original uploaded file.
        
        Args:
            user_id: User ID
            pdf_id: PDF ID
            
        Returns:
            File path or None if not found
        """
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        
        if not pdf_dir.exists():
            return None
        
        # Look for PDF files in the directory
        for file_path in pdf_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() == '.pdf':
                return str(file_path)
        
        return None
    
    def content_exists(self, user_id: int, pdf_id: str) -> bool:
        """
        Check if processed content exists for a PDF.
        
        Args:
            user_id: User ID
            pdf_id: PDF ID
            
        Returns:
            True if processed content exists
        """
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        
        compressed_file = pdf_dir / "content.json.gz"
        uncompressed_file = pdf_dir / "content.json"
        
        return compressed_file.exists() or uncompressed_file.exists()
    
    def delete_pdf_directory(self, user_id: int, pdf_id: str) -> bool:
        """
        Delete the entire PDF directory and all its contents.
        
        Args:
            user_id: User ID
            pdf_id: PDF ID
            
        Returns:
            True if successfully deleted
        """
        pdf_dir = self.get_pdf_directory(user_id, pdf_id)
        
        if pdf_dir.exists():
            try:
                shutil.rmtree(pdf_dir)
                return True
            except Exception as e:
                print(f"Error deleting PDF directory {pdf_dir}: {e}")
                return False
        
        return True
    
    def migrate_existing_file(self, old_file_path: str, user_id: int, pdf_id: str) -> str:
        """
        Migrate an existing file to the new directory structure.
        
        Args:
            old_file_path: Current file path
            user_id: User ID
            pdf_id: PDF ID
            
        Returns:
            New file path
        """
        if not os.path.exists(old_file_path):
            raise FileNotFoundError(f"Source file not found: {old_file_path}")
        
        # Create new directory
        pdf_dir = self.create_pdf_directory(user_id, pdf_id)
        
        # Get filename from old path
        filename = os.path.basename(old_file_path)
        safe_filename = self._sanitize_filename(filename)
        
        # Copy file to new location
        new_file_path = pdf_dir / safe_filename
        shutil.copy2(old_file_path, new_file_path)
        
        # Remove old file
        try:
            os.remove(old_file_path)
        except Exception as e:
            print(f"Warning: Could not remove old file {old_file_path}: {e}")
        
        return str(new_file_path)
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to be safe for all operating systems.
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        # Remove or replace unsafe characters
        safe_chars = []
        for char in filename:
            if char.isalnum() or char in "._-":
                safe_chars.append(char)
            elif char in " ":
                safe_chars.append("_")
        
        safe_filename = "".join(safe_chars)
        
        # Ensure it doesn't start with a dot
        if safe_filename.startswith('.'):
            safe_filename = "file" + safe_filename
        
        # Ensure it has an extension
        if not safe_filename.lower().endswith('.pdf'):
            safe_filename += '.pdf'
        
        return safe_filename 