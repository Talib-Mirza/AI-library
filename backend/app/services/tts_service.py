from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
import aiohttp
import asyncio
import json
import base64
import logging
from enum import Enum
from app.core.config import settings

logger = logging.getLogger(__name__)


class TTSProvider(str, Enum):
    GOOGLE = "google"


class TTSRequest:
    def __init__(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
        language_code: str = "en-US",
        pitch: float = 0.0,
        model: str = None  # For OpenAI compatibility
    ):
        self.text = text
        self.voice = voice
        self.speed = speed
        self.language_code = language_code
        self.pitch = pitch
        self.model = model


class TTSResponse:
    def __init__(self, audio_content: bytes, text: str, duration: float = 0.0):
        self.audio_content = audio_content
        self.text = text
        self.duration = duration


class BaseTTSProvider(ABC):
    """Abstract base class for TTS providers"""
    
    @abstractmethod
    async def synthesize_speech(self, request: TTSRequest) -> TTSResponse:
        """Convert text to speech"""
        pass
    
    @abstractmethod
    def get_available_voices(self) -> List[Dict[str, str]]:
        """Get list of available voices"""
        pass
    
    @abstractmethod
    def get_default_voice(self) -> str:
        """Get default voice for this provider"""
        pass


class GoogleTTSProvider(BaseTTSProvider):
    """Google Cloud Text-to-Speech provider"""
    
    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key
        self.base_url = "https://texttospeech.googleapis.com/v1/text:synthesize"
        
    async def synthesize_speech(self, request: TTSRequest) -> TTSResponse:
        if not self.api_key:
            raise ValueError("Google TTS API key not configured")
            
        # Use default voice if none specified
        voice = request.voice or self.get_default_voice()
        
        payload = {
            "input": {"text": request.text},
            "voice": {
                "languageCode": request.language_code,
                "name": voice
            },
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": request.speed,
                "pitch": request.pitch
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}?key={self.api_key}",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if not response.ok:
                    error_text = await response.text()
                    raise Exception(f"Google TTS API error: {response.status} - {error_text}")
                
                response_data = await response.json()
                
                if "audioContent" not in response_data:
                    raise Exception("No audio content received from Google TTS API")
                
                # Decode base64 audio content
                audio_content = base64.b64decode(response_data["audioContent"])
                duration = self._estimate_duration(request.text)
                
                return TTSResponse(audio_content, request.text, duration)
    
    def get_available_voices(self) -> List[Dict[str, str]]:
        """Get Google TTS standard voices"""
        return [
            {"name": "en-US-Standard-A", "gender": "Male", "description": "Standard male voice"},
            {"name": "en-US-Standard-B", "gender": "Male", "description": "Standard male voice"},
            {"name": "en-US-Standard-C", "gender": "Female", "description": "Standard female voice"},
            {"name": "en-US-Standard-D", "gender": "Male", "description": "Standard male voice"},
            {"name": "en-US-Standard-E", "gender": "Female", "description": "Standard female voice"},
            {"name": "en-US-Standard-F", "gender": "Female", "description": "Standard female voice"},
            {"name": "en-US-Standard-G", "gender": "Female", "description": "Standard female voice"},
            {"name": "en-US-Standard-H", "gender": "Female", "description": "Standard female voice"},
            {"name": "en-US-Standard-I", "gender": "Male", "description": "Standard male voice"},
            {"name": "en-US-Standard-J", "gender": "Male", "description": "Standard male voice"},
        ]
    
    def get_default_voice(self) -> str:
        return "en-US-Standard-A"
    
    def _estimate_duration(self, text: str) -> float:
        """Estimate audio duration based on text length"""
        words_per_minute = 150
        avg_word_length = 5
        word_count = len(text) / avg_word_length
        return (word_count / words_per_minute) * 60


def create_tts_provider(provider: TTSProvider) -> BaseTTSProvider:
    """Factory function to create TTS provider instances"""
    if provider == TTSProvider.GOOGLE:
        if not settings.GOOGLE_TTS_API_KEY:
            raise ValueError("Google API key not configured")
        return GoogleTTSProvider(settings.GOOGLE_TTS_API_KEY)
    else:
        raise ValueError(f"Unsupported TTS provider: {provider}")

class TTSService:
    def __init__(self, provider: TTSProvider = TTSProvider.GOOGLE):
        """Initialize TTS service with Google TTS as the only provider"""
        self.current_provider = provider
        self.cache = {}  # Initialize cache dictionary
        try:
            self.provider_instance = create_tts_provider(provider)
            logger.info(f"✅ TTS Service initialized with Google TTS provider")
        except Exception as e:
            logger.error(f"❌ Failed to initialize TTS service: {e}")
            self.provider_instance = None
            raise e

    def switch_provider(self, provider: TTSProvider):
        """Switch TTS provider (Google TTS only)"""
        if provider != TTSProvider.GOOGLE:
            raise ValueError("Only Google TTS provider is supported")
            
        try:
            self.provider_instance = create_tts_provider(provider)
            self.current_provider = provider
            logger.info(f"✅ Switched to Google TTS provider")
        except Exception as e:
            logger.error(f"❌ Failed to switch to provider {provider}: {e}")
            raise e

    async def synthesize_speech(self, request: TTSRequest) -> TTSResponse:
        """Convert text to speech using the current provider"""
        if self.provider_instance is None:
            raise ValueError(getattr(self, '_initialization_error', 'TTS provider not initialized'))
        
        if not hasattr(self, 'cache'): self.cache = {}
        cache_key = self._generate_cache_key(request)
        
        # Check cache first
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Generate speech
        response = await self.provider_instance.synthesize_speech(request)
        
        # Cache the response
        self.cache[cache_key] = response
        
        return response
    
    async def synthesize_batch(self, requests: List[TTSRequest]) -> List[TTSResponse]:
        """Convert multiple texts to speech"""
        tasks = [self.synthesize_speech(request) for request in requests]
        return await asyncio.gather(*tasks)
    
    def get_available_voices(self) -> List[Dict[str, str]]:
        """Get available voices for the current provider"""
        if self.provider_instance is None:
            raise ValueError(getattr(self, '_initialization_error', 'TTS provider not initialized'))
        return self.provider_instance.get_available_voices()
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get information about the current provider"""
        if self.provider_instance is None:
            raise ValueError(getattr(self, '_initialization_error', 'TTS provider not initialized'))
        return {
            "provider": self.current_provider.value,
            "available_voices": self.get_available_voices(),
            "default_voice": self.provider_instance.get_default_voice()
        }
    
    def _generate_cache_key(self, request: TTSRequest) -> str:
        """Generate a cache key for the request"""
        key_parts = [
            self.current_provider.value,
            request.text,
            str(request.voice or self.provider_instance.get_default_voice()),
            str(request.speed),
            request.language_code,
            str(request.pitch),
            str(request.model or "")
        ]
        return "|".join(key_parts)
    
    def clear_cache(self):
        """Clear the TTS cache"""
        self.cache.clear()
    
    def get_cache_info(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_size = sum(len(response.audio_content) for response in self.cache.values())
        return {
            "entries": len(self.cache),
            "total_size_bytes": total_size,
            "total_size_mb": total_size / (1024 * 1024)
        }


# Lazy singleton getter
_tts_service_instance: Optional[TTSService] = None

def get_tts_service() -> TTSService:
    global _tts_service_instance
    if _tts_service_instance is None:
        _tts_service_instance = TTSService(TTSProvider.GOOGLE)
    return _tts_service_instance
