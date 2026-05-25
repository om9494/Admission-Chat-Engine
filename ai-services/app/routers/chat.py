"""
Chat router — RAG-powered Q&A endpoint.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.vector_store import get_vector_store
from app.core.llm import build_rag_chain

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory session memory store (replace with Redis for production)
# Bounded to prevent unbounded memory growth
_MAX_SESSIONS = 1000
_session_memories: dict = {}


def _get_or_create_memory(session_id: str):
    """Return existing memory or create a new one, evicting oldest if at capacity."""
    from langchain.memory import ConversationBufferWindowMemory

    if session_id not in _session_memories:
        if len(_session_memories) >= _MAX_SESSIONS:
            # Evict the oldest session
            oldest = next(iter(_session_memories))
            del _session_memories[oldest]
            logger.warning(f"Session memory limit reached. Evicted session: {oldest}")

        _session_memories[session_id] = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            k=10,
        )
    return _session_memories[session_id]


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    answer: str
    sources: list
    session_id: Optional[str] = None
    message_id: Optional[str] = None


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main RAG chat endpoint.
    Retrieves relevant documents from ChromaDB and generates an answer via Groq.
    """
    try:
        vs = get_vector_store()
        retriever = vs.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5},
        )

        session_id = request.session_id or "default"
        memory = _get_or_create_memory(session_id)

        chain = build_rag_chain(retriever, memory)
        result = chain({"question": request.message})

        # Format sources
        sources = []
        for doc in result.get("source_documents", []):
            sources.append({
                "title": doc.metadata.get("title", ""),
                "source": doc.metadata.get("source", ""),
                "score": doc.metadata.get("score"),
            })

        return ChatResponse(
            answer=result["answer"],
            sources=sources,
            session_id=session_id,
        )

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred processing your request.")


@router.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear conversation memory for a session."""
    _session_memories.pop(session_id, None)
    return {"success": True}
