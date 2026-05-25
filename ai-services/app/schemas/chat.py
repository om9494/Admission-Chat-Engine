from pydantic import BaseModel
from typing import Optional, List


class Source(BaseModel):
    title: Optional[str] = None
    source: Optional[str] = None
    score: Optional[float] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    answer: str
    sources: List[Source] = []
    session_id: Optional[str] = None
    message_id: Optional[str] = None
