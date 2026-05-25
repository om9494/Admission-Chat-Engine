"""
Ingestion router — PDF upload and web crawling endpoints.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import List
import logging
import tempfile
import os

from app.ingestion.pdf_ingester import ingest_pdf
from app.ingestion.web_crawler import crawl_url

logger = logging.getLogger(__name__)
router = APIRouter()


class CrawlRequest(BaseModel):
    url: str
    max_pages: int = 20
    depth: int = 2


class IngestResult(BaseModel):
    source: str
    status: str
    chunks: int
    message: str = ""


@router.post("/pdf", response_model=dict)
async def ingest_pdfs(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """
    Upload and ingest one or more PDF files into the vector store.
    """
    results = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            results.append(IngestResult(
                source=file.filename, status="error", chunks=0,
                message="Only PDF files are supported"
            ))
            continue

        try:
            # Save to temp file
            tmp_path = None
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name

            chunks = await ingest_pdf(tmp_path, metadata={"filename": file.filename})
            results.append(IngestResult(
                source=file.filename, status="success", chunks=chunks
            ))
        except Exception as e:
            logger.error(f"PDF ingestion error for {file.filename}: {e}")
            results.append(IngestResult(
                source=file.filename, status="error", chunks=0, message=str(e)
            ))
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return {"results": [r.dict() for r in results]}


@router.post("/crawl", response_model=dict)
async def crawl(request: CrawlRequest):
    """
    Crawl a URL and ingest its content into the vector store.
    """
    try:
        result = await crawl_url(
            url=request.url,
            max_pages=request.max_pages,
            depth=request.depth,
        )
        return {
            "source": request.url,
            "status": "success",
            "pages_crawled": result["pages_crawled"],
            "chunks": result["chunks"],
        }
    except Exception as e:
        logger.error(f"Crawl error for {request.url}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats():
    """Return vector store document count."""
    from app.core.vector_store import get_vector_store
    vs = get_vector_store()
    count = vs._collection.count()
    return {"total_documents": count}
