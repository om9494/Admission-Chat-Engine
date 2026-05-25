"""
PDF ingestion pipeline.
Loads PDF → splits into chunks → embeds → stores in ChromaDB.
"""

import logging
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.vector_store import add_documents
from app.config import settings

logger = logging.getLogger(__name__)


async def ingest_pdf(file_path: str, metadata: dict | None = None) -> int:
    """
    Ingest a PDF file into the vector store.

    Args:
        file_path: Path to the PDF file.
        metadata: Optional metadata to attach to all chunks.

    Returns:
        Number of chunks ingested.
    """
    logger.info(f"Ingesting PDF: {file_path}")

    # Load PDF
    loader = PyPDFLoader(file_path)
    pages = loader.load()

    if not pages:
        raise ValueError(f"No content extracted from PDF: {file_path}")

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    # Prepare texts and metadatas
    texts = [chunk.page_content for chunk in chunks]
    metadatas = []
    for i, chunk in enumerate(chunks):
        meta = {**chunk.metadata, **(metadata or {})}
        meta["chunk_index"] = i
        meta["source_type"] = "pdf"
        metadatas.append(meta)

    # Add to vector store
    ids = await add_documents(texts, metadatas)
    logger.info(f"Ingested {len(ids)} chunks from {file_path}")
    return len(ids)
