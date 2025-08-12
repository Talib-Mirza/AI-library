from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
from io import BytesIO
import logging

from app.services.tts_service import (
    get_tts_service, 
    TTSRequest, 
    TTSProvider,
    TTSResponse
)
from app.auth.dependencies import get_current_user, require_within_tts_quota
from app.models.user import User
from app.services.usage_service import usage_service

logger = logging.getLogger(__name__)

router = APIRouter()


class TTSRequestModel(BaseModel):
    text: str
    voice: Optional[str] = None
    speed: float = 1.0
    language_code: str = "en-US"
    pitch: float = 0.0
    model: Optional[str] = None


class TTSBatchRequestModel(BaseModel):
    requests: List[TTSRequestModel]


class TTSResponseModel(BaseModel):
    text: str
    duration: float
    audio_url: str  # This will be a data URL for the audio


class SwitchProviderRequest(BaseModel):
    provider: str  # "google" only


@router.post("/synthesize", response_model=TTSResponseModel)
async def synthesize_speech(
    request: TTSRequestModel,
    current_user: User = Depends(get_current_user)
):
    """
    Convert text to speech using the current TTS provider
    """
    try:
        tts_service = get_tts_service()
        tts_request = TTSRequest(
            text=request.text,
            voice=request.voice,
            speed=request.speed,
            language_code=request.language_code,
            pitch=request.pitch,
            model=request.model
        )
        
        response = await tts_service.synthesize_speech(tts_request)
        
        # Convert audio content to base64 data URL
        import base64
        audio_b64 = base64.b64encode(response.audio_content).decode('utf-8')
        audio_url = f"data:audio/mp3;base64,{audio_b64}"

        return TTSResponseModel(
            text=response.text,
            duration=response.duration,
            audio_url=audio_url
        )
        
    except ValueError as e:
        # Handle TTS provider not configured
        raise HTTPException(status_code=400, detail=f"TTS not configured: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesize/audio")
async def synthesize_speech_audio(
    request: TTSRequestModel,
    current_user=Depends(get_current_user)
):
    """
    Convert text to speech and return raw audio data
    """
    try:
        tts_service = get_tts_service()
        tts_request = TTSRequest(
            text=request.text,
            voice=request.voice,
            speed=request.speed,
            language_code=request.language_code,
            pitch=request.pitch,
            model=request.model
        )
        
        response = await tts_service.synthesize_speech(tts_request)
        
        # Return audio as streaming response
        audio_stream = BytesIO(response.audio_content)
        
        return StreamingResponse(
            audio_stream, 
            media_type="audio/mp3",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3",
                "X-Text-Duration": str(response.duration)
            }
        )
        
    except ValueError as e:
        # Handle TTS provider not configured
        raise HTTPException(status_code=400, detail=f"TTS not configured: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesize/batch")
async def synthesize_batch(
    request: TTSBatchRequestModel,
    current_user=Depends(get_current_user)
):
    """
    Convert multiple texts to speech
    """
    try:
        tts_service = get_tts_service()
        tts_requests = [
            TTSRequest(
                text=req.text,
                voice=req.voice,
                speed=req.speed,
                language_code=req.language_code,
                pitch=req.pitch,
                model=req.model
            ) for req in request.requests
        ]
        
        responses = await tts_service.synthesize_batch(tts_requests)
        
        # Convert all responses to data URLs
        import base64
        result = []
        for response in responses:
            audio_b64 = base64.b64encode(response.audio_content).decode('utf-8')
            audio_url = f"data:audio/mp3;base64,{audio_b64}"
            result.append(TTSResponseModel(
                text=response.text,
                duration=response.duration,
                audio_url=audio_url
            ))
        
        return result
        
    except ValueError as e:
        # Handle TTS provider not configured
        raise HTTPException(status_code=400, detail=f"TTS not configured: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def get_available_voices(current_user=Depends(get_current_user)):
    """
    Get available voices for the current TTS provider
    """
    try:
        tts_service = get_tts_service()
        return {
            "voices": tts_service.get_available_voices(),
            "provider": tts_service.current_provider.value
        }
    except ValueError as e:
        # Handle TTS provider not configured
        raise HTTPException(status_code=400, detail=f"TTS not configured: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/provider-info")
async def get_provider_info(current_user=Depends(get_current_user)):
    """
    Get information about the current TTS provider
    """
    try:
        tts_service = get_tts_service()
        return tts_service.get_provider_info()
    except ValueError as e:
        # Handle TTS provider not configured
        raise HTTPException(status_code=400, detail=f"TTS not configured: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/switch-provider")
async def switch_provider(
    request: SwitchProviderRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Switch TTS provider (Google TTS only)
    """
    try:
        tts_service = get_tts_service()
        if request.provider.lower() == "google":
            tts_service.switch_provider(TTSProvider.GOOGLE)
            return {
                "success": True,
                "message": f"Switched to {request.provider} TTS provider",
                "provider": request.provider.lower()
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid provider. Only 'google' is supported"
            )
    except Exception as e:
        logger.error(f"Error switching TTS provider: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to switch provider: {str(e)}")


@router.get("/cache-info")
async def get_cache_info(current_user=Depends(get_current_user)):
    """
    Get TTS cache statistics
    """
    try:
        tts_service = get_tts_service()
        return tts_service.get_cache_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-cache")
async def clear_cache(current_user=Depends(get_current_user)):
    """
    Clear the TTS cache
    """
    try:
        tts_service = get_tts_service()
        tts_service.clear_cache()
        return {"message": "TTS cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
