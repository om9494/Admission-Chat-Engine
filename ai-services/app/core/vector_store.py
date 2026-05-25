"""
ChromaDB vector store setup and retrieval utilities.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.config import settings
import logging

logger = logging.getLogger(__name__)

_chroma_client: chromadb.HttpClient | None = None
_vector_store: Chroma | None = None
_embeddings: HuggingFaceEmbeddings | None = None


async def init_vector_store():
    """Initialize ChromaDB client and embedding model on startup."""
    global _chroma_client, _vector_store, _embeddings

    logger.info("Initializing ChromaDB and embeddings...")

    _embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    # Use synchronous HttpClient — Chroma's LangChain integration is synchronous
    _chroma_client = chromadb.HttpClient(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    _vector_store = Chroma(
        client=_chroma_client,
        collection_name=settings.CHROMA_COLLECTION,
        embedding_function=_embeddings,
    )

    logger.info(f"Vector store ready — collection: {settings.CHROMA_COLLECTION}")


def get_vector_store() -> Chroma:
    if _vector_store is None:
        raise RuntimeError("Vector store not initialized. Call init_vector_store() first.")
    return _vector_store


def get_embeddings() -> HuggingFaceEmbeddings:
    if _embeddings is None:
        raise RuntimeError("Embeddings not initialized.")
    return _embeddings


def add_documents_sync(documents: list, metadatas: list | None = None) -> list[str]:
    """Add documents to the vector store synchronously and return their IDs."""
    vs = get_vector_store()
    ids = vs.add_texts(
        texts=documents,
        metadatas=metadatas or [{}] * len(documents),
    )
    return ids


async def add_documents(documents: list, metadatas: list | None = None) -> list[str]:
    """Add documents to the vector store and return their IDs.
    
    Runs the synchronous ChromaDB operation in a thread pool to avoid
    blocking the event loop.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    ids = await loop.run_in_executor(
        None, add_documents_sync, documents, metadatas
    )
    return ids


def similarity_search_sync(query: str, k: int | None = None) -> list:
    """Return top-k documents with scores for a query (synchronous)."""
    vs = get_vector_store()
    k = k or settings.RAG_TOP_K
    results = vs.similarity_search_with_relevance_scores(query, k=k)
    return [
        {"content": doc.page_content, "metadata": doc.metadata, "score": score}
        for doc, score in results
        if score >= settings.RAG_SCORE_THRESHOLD
    ]


async def similarity_search(query: str, k: int | None = None) -> list:
    """Return top-k documents with scores for a query (async wrapper)."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, similarity_search_sync, query, k)
