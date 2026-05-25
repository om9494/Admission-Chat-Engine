"""
Speech router — Whisper transcription endpoint.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import tempfile
import os
import logging

from app.core.whisper_model import transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
):
    """
    Transcribe an audio file using OpenAI Whisper.
    Supports webm, mp3, wav, m4a formats.
    """
    allowed_types = {"audio/webm", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"}
    if audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {audio.content_type}"
        )

    suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name

        result = transcribe_audio(tmp_path, language=language)
        return result

    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
