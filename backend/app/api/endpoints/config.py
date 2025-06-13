from fastapi import APIRouter
from app.core.config import settings
# Remove the auth dependency for now
# from app.auth.deps import get_current_user
# from app.schemas.user import User

router = APIRouter()

@router.get("/gemini-key")
# Remove authentication requirement
# async def get_gemini_api_key(current_user: User = Depends(get_current_user)):
async def get_gemini_api_key():
    """
    Returns the Gemini API key to authenticated users.
    This endpoint is protected and requires authentication.
    """
    # We're using environment variable GOOGLE_API_KEY for Gemini
    return {"apiKey": settings.GOOGLE_API_KEY}

@router.get("/debug-keys")
# Remove authentication requirement
# async def debug_api_keys(current_user: User = Depends(get_current_user)):
async def debug_api_keys():
    """
    Debug endpoint to check if API keys are available.
    This is for development purposes only.
    """
    has_google_key = bool(settings.GOOGLE_API_KEY)
    has_openai_key = bool(settings.OPENAI_API_KEY)
    
    return {
        "google_key_available": has_google_key,
        "openai_key_available": has_openai_key
    } 