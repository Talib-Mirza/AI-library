import os
import fitz
import hashlib
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime

class PDFParserService:
    def __init__(self, base_cache_dir: str = "parsed_pdfs"):
        self.base_cache_dir = Path(base_cache_dir)
        self.base_cache_dir.mkdir(exist_ok=True)
    
    def _get_cache_path(self, user_id: str, pdf_filename: str, include_timestamp: bool = True) -> Path:
        """Get the cache directory path for a specific PDF."""
        # Remove extension and create a safe filename
        safe_filename = Path(pdf_filename).stem
        # Create a hash of the original filename to ensure uniqueness
        filename_hash = hashlib.md5(pdf_filename.encode()).hexdigest()[:8]
        
        # Ensure user directory exists
        user_dir = self.base_cache_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        
        if include_timestamp:
            # Add timestamp to avoid collisions for new uploads
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            cache_dir = user_dir / f"{safe_filename}_{filename_hash}_{timestamp}"
        else:
            # For retrieving cached content, look for the most recent version
            if not user_dir.exists():
                print(f"User directory not found: {user_dir}")
                return user_dir / f"{safe_filename}_{filename_hash}_dummy"
            
            # Find all matching directories
            matching_dirs = list(user_dir.glob(f"{safe_filename}_{filename_hash}_*"))
            if not matching_dirs:
                print(f"No matching directories found for {safe_filename}_{filename_hash}_*")
                return user_dir / f"{safe_filename}_{filename_hash}_dummy"
            
            # Return the most recent directory
            return max(matching_dirs, key=lambda x: x.stat().st_mtime)
        
        return cache_dir

    def _save_text_content(self, cache_dir: Path, text_content: str) -> Path:
        """Save extracted text content to a file."""
        text_file = cache_dir / "content.txt"
        text_file.write_text(text_content, encoding='utf-8')
        return text_file

    def _save_metadata(self, cache_dir: Path, metadata: Dict) -> Path:
        """Save PDF metadata to a JSON file."""
        metadata_file = cache_dir / "metadata.json"
        metadata_file.write_text(json.dumps(metadata, indent=2), encoding='utf-8')
        return metadata_file

    def _extract_images(self, doc: fitz.Document, page_num: int, cache_dir: Path) -> List[Dict]:
        """Extract images from a specific page and save them to disk."""
        page = doc[page_num]
        image_list = []
        
        # Get all images on the page
        image_refs = page.get_images(full=True)
        
        for img_idx, img_ref in enumerate(image_refs):
            xref = img_ref[0]
            try:
                # Extract image
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # Create image filename
                image_filename = f"page_{page_num + 1}_image_{img_idx}.{image_ext}"
                image_path = cache_dir / "images" / image_filename
                
                # Ensure images directory exists
                image_path.parent.mkdir(exist_ok=True)
                
                # Save image
                image_path.write_bytes(image_bytes)
                
                # Add to image list
                image_list.append({
                    "filename": image_filename,
                    "path": str(image_path.relative_to(self.base_cache_dir)),
                    "page": page_num + 1,
                    "index": img_idx,
                    "format": image_ext
                })
            except Exception as e:
                print(f"Error extracting image {img_idx} from page {page_num + 1}: {str(e)}")
                continue
                
        return image_list

    def parse_pdf(self, pdf_path: str, user_id: str, pdf_filename: str) -> Dict:
        """Parse a PDF file, extract text and images, and cache the results."""
        # Check if we already have cached results
        cache_dir = self._get_cache_path(user_id, pdf_filename, include_timestamp=False)
        metadata_file = cache_dir / "metadata.json"
        
        if metadata_file.exists():
            try:
                # Load cached results
                metadata = json.loads(metadata_file.read_text(encoding='utf-8'))
                return metadata
            except Exception as e:
                print(f"Error loading cached results: {str(e)}")
                # If there's an error loading cache, we'll reparse the PDF
        
        # Create new cache directory with timestamp
        cache_dir = self._get_cache_path(user_id, pdf_filename, include_timestamp=True)
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Extract text from all pages
        text_content = ""
        all_images = []
        
        for page_num in range(len(doc)):
            # Get text
            page = doc[page_num]
            text_content += page.get_text("text") + "\n\n"
            
            # Extract images
            page_images = self._extract_images(doc, page_num, cache_dir)
            all_images.extend(page_images)
        
        # Save text content
        text_file = self._save_text_content(cache_dir, text_content)
        
        # Prepare metadata
        metadata = {
            "text_file": str(text_file.relative_to(self.base_cache_dir)),
            "images": all_images,
            "total_pages": len(doc),
            "total_images": len(all_images),
            "parsed_at": datetime.now().isoformat(),
            "original_filename": pdf_filename
        }
        
        # Save metadata
        self._save_metadata(cache_dir, metadata)
        
        # Close PDF
        doc.close()
        
        return metadata

    def get_cached_content(self, user_id: str, pdf_filename: str) -> Optional[Dict]:
        """Get cached content for a PDF if it exists."""
        try:
            # Convert forward slashes to backslashes for Windows paths
            normalized_filename = pdf_filename.replace('/', '\\')
            print(f"Looking for cached content for filename: {normalized_filename}")
            
            # If the filename is just the base name, we need to construct the full path
            if not normalized_filename.startswith('uploads'):
                normalized_filename = f"uploads\\{normalized_filename}"
            print(f"Full path: {normalized_filename}")
            
            # Extract just the filename from the path
            filename_parts = normalized_filename.split('\\')
            base_filename = filename_parts[-1]
            print(f"Base filename: {base_filename}")
            
            cache_dir = self._get_cache_path(user_id, base_filename, include_timestamp=False)
            metadata_file = cache_dir / "metadata.json"
            
            print(f"Looking for metadata file in: {metadata_file}")
            
            if metadata_file.exists():
                try:
                    metadata = json.loads(metadata_file.read_text(encoding='utf-8'))
                    print(f"Successfully loaded metadata for {base_filename}")
                    return metadata
                except Exception as e:
                    print(f"Error loading cached content: {str(e)}")
                    return None
            else:
                print(f"Metadata file not found: {metadata_file}")
                # List all files in the user directory for debugging
                user_dir = self.base_cache_dir / user_id
                if user_dir.exists():
                    print(f"Contents of user directory {user_dir}:")
                    for item in user_dir.iterdir():
                        print(f"  - {item.name}")
            return None
        except Exception as e:
            print(f"Error in get_cached_content: {str(e)}")
            return None 