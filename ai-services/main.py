"""
Admission Chat Engine — AI Services (FastAPI)
Entry point for the Python AI backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import chat, ingest, speech
from app.core.vector_store import init_vector_store
from app.core.whisper_model import init_whisper


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Startup
    await init_vector_store()
    await init_whisper()
    yield
    # Shutdown — cleanup if needed


app = FastAPI(
    title="Admission Chat AI Services",
    description="RAG-powered admission assistant with MCP agents, web crawling, and PDF ingestion.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(ingest.router, prefix="/ingest", tags=["Ingestion"])
app.include_router(speech.router, prefix="/speech", tags=["Speech"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "ai-services"}
