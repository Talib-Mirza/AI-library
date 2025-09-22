from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import aiofiles
import os
import uuid
import tempfile
from openai import OpenAI

from app.core.config import settings
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/")
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (webm/opus preferred)"),
    language: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    try:
        if not settings.OPENAI_API_KEY:
            raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured")

        # Validate content type
        content_type = (audio.content_type or '').lower()
        if settings.DEBUG:
            try:
                size_hint = getattr(audio, 'size', 'unknown')
                print(f"[STT] Incoming content_type={content_type} filename={audio.filename} size_hint={size_hint}")
            except Exception:
                pass
        if not (content_type.startswith("audio/") or (audio.filename or '').lower().endswith(('.webm', '.wav', '.mp3', '.m4a', '.ogg'))):
            raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")

        # Save to a temporary file to ensure OpenAI SDK can read it reliably
        orig_name = audio.filename or ''
        ext = os.path.splitext(orig_name)[1].lower()
        if not ext:
            # Default to .webm when unknown
            ext = '.webm'
        temp_dir = tempfile.mkdtemp(prefix="stt_")
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}{ext}")

        try:
            total_bytes = 0
            async with aiofiles.open(temp_path, 'wb') as out_file:
                while True:
                    chunk = await audio.read(1024 * 1024)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    await out_file.write(chunk)
            if settings.DEBUG:
                print(f"[STT] Wrote temp file: {temp_path} bytes={total_bytes}")

            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            default_language = language or 'en'
            prompt = "Transcribe the spoken audio clearly in English."
            # Open the temp file for transcription
            if settings.DEBUG:
                print(f"[STT] Calling Whisper model=whisper-1 lang={default_language}")
            with open(temp_path, 'rb') as f:
                result = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    language=default_language,
                    prompt=prompt,
                )
            if settings.DEBUG:
                print(f"[STT] Whisper response received")

            text = getattr(result, 'text', None)
            if settings.DEBUG:
                print(f"[STT] Transcript length: {len(text or '')}")
            if not text or not str(text).strip():
                raise HTTPException(status_code=400, detail="No transcription detected")
            # Reject punctuation-only / no-word transcripts
            if not any(ch.isalnum() for ch in str(text)):
                raise HTTPException(status_code=400, detail="No words detected in transcription")

            return JSONResponse({"text": text})
        finally:
            # Cleanup temp file and directory
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                if os.path.isdir(temp_dir):
                    os.rmdir(temp_dir)
            except Exception:
                pass

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 