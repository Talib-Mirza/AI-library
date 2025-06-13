from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from typing import List
import os
from pathlib import Path
from app.services.pdf_parser_service import PDFParserService
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()
pdf_parser = PDFParserService()

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload and parse a PDF file."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads") / str(current_user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save the uploaded file
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    try:
        # Parse the PDF and cache the results
        metadata = pdf_parser.parse_pdf(
            pdf_path=str(file_path),
            user_id=str(current_user.id),
            pdf_filename=file.filename
        )
        
        # Return the parsing results
        return JSONResponse(content={
            "message": "PDF uploaded and parsed successfully",
            "metadata": metadata
        })
        
    except Exception as e:
        # Clean up the uploaded file if parsing fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@router.get("/cached/{filename:path}")
async def get_cached_pdf(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """Get cached content for a previously parsed PDF."""
    try:
        print(f"Received request for cached PDF: {filename}")
        # Convert forward slashes to backslashes for Windows paths
        normalized_filename = filename.replace('/', '\\')
        print(f"Normalized filename: {normalized_filename}")
        
        # If the filename is just the base name, we need to construct the full path
        if not normalized_filename.startswith('uploads'):
            normalized_filename = f"uploads\\{normalized_filename}"
        print(f"Full path: {normalized_filename}")
        
        metadata = pdf_parser.get_cached_content(
            user_id=str(current_user.id),
            pdf_filename=normalized_filename
        )
        
        if not metadata:
            print(f"No cached content found for {normalized_filename}")
            raise HTTPException(status_code=404, detail="No cached content found for this PDF")
        
        print(f"Successfully retrieved cached content for {normalized_filename}")
        return metadata
    except Exception as e:
        print(f"Error retrieving cached content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving cached content: {str(e)}")

@router.get("/parsed/{user_id}/{pdf_dir}/images/{image_filename}")
async def get_parsed_image(
    user_id: str,
    pdf_dir: str,
    image_filename: str,
    current_user: User = Depends(get_current_user)
):
    """Serve a parsed image file."""
    # Verify the requesting user has access to this content
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    image_path = Path("parsed_pdfs") / user_id / pdf_dir / "images" / image_filename
    
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(str(image_path)) 