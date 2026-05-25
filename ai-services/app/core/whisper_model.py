"""
OpenAI Whisper model loader for speech-to-text.
"""

import whisper
import logging
from app.config import settings

logger = logging.getLogger(__name__)

_whisper_model = None


async def init_whisper():
    """Load Whisper model on startup."""
    global _whisper_model
    logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
    _whisper_model = whisper.load_model(settings.WHISPER_MODEL)
    logger.info("Whisper model loaded.")


def get_whisper_model():
    if _whisper_model is None:
        raise RuntimeError("Whisper model not initialized.")
    return _whisper_model


def transcribe_audio(audio_path: str, language: str | None = None) -> dict:
    """
    Transcribe audio file using Whisper.
    Returns dict with 'text' and 'language' keys.
    """
    model = get_whisper_model()
    options = {}
    if language and language != "auto":
        options["language"] = language

    result = model.transcribe(audio_path, **options)
    return {
        "text": result["text"].strip(),
        "language": result.get("language", "en"),
        "segments": result.get("segments", []),
    }
