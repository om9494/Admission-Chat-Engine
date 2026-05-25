from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Groq
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama3-8b-8192"

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "admission_docs"

    # MongoDB
    MONGODB_URI: str = ""

    # JWT
    JWT_SECRET: str = "change-me"

    # Whisper
    WHISPER_MODEL: str = "base"

    # RAG
    RAG_TOP_K: int = 5
    RAG_SCORE_THRESHOLD: float = 0.3
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # App
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3001"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
