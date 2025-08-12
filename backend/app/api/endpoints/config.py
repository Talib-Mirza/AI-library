from fastapi import APIRouter, HTTPException
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
    Returns the Gemini API key for development only. In production, this endpoint is disabled.
    """
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")
    # Never return full secrets; return masked preview only
    key = settings.GOOGLE_API_KEY or ""
    masked = (key[:4] + "..." + key[-4:]) if key else None
    return {"apiKeyPreview": masked}

@router.get("/debug-keys")
# Remove authentication requirement
# async def debug_api_keys(current_user: User = Depends(get_current_user)):
async def debug_api_keys():
    """
    Debug endpoint to check if API keys are available (development only).
    """
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")
    has_google_key = bool(settings.GOOGLE_API_KEY)
    has_openai_key = bool(settings.OPENAI_API_KEY)
    
    return {
        "google_key_available": has_google_key,
        "openai_key_available": has_openai_key
    } 