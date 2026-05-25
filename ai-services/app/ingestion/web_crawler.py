"""
Web crawler module.
Crawls a URL (and optionally sub-pages) and ingests content into ChromaDB.
"""

import logging
import asyncio
from urllib.parse import urljoin, urlparse
from typing import Set

import httpx
from bs4 import BeautifulSoup
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.vector_store import add_documents
from app.config import settings

logger = logging.getLogger(__name__)


def _extract_text(html: str) -> str:
    """Extract clean text from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove scripts, styles, nav, footer
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def _get_links(html: str, base_url: str) -> list[str]:
    """Extract internal links from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    base_domain = urlparse(base_url).netloc
    links = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        parsed = urlparse(href)
        if parsed.netloc == base_domain and parsed.scheme in ("http", "https"):
            links.append(href.split("#")[0])  # Remove fragments
    return list(set(links))


async def crawl_url(url: str, max_pages: int = 20, depth: int = 2) -> dict:
    """
    Crawl a URL and ingest all discovered pages into the vector store.

    Args:
        url: Starting URL.
        max_pages: Maximum number of pages to crawl.
        depth: Maximum crawl depth.

    Returns:
        Dict with pages_crawled and chunks counts.
    """
    visited: Set[str] = set()
    queue = [(url, 0)]
    all_texts = []
    all_metadatas = []

    async with httpx.AsyncClient(
        timeout=30,
        follow_redirects=True,
        headers={"User-Agent": "AdmissionChatBot/1.0 (educational crawler)"},
    ) as client:
        while queue and len(visited) < max_pages:
            current_url, current_depth = queue.pop(0)

            if current_url in visited:
                continue
            visited.add(current_url)

            try:
                logger.info(f"Crawling: {current_url}")
                response = await client.get(current_url)
                response.raise_for_status()

                if "text/html" not in response.headers.get("content-type", ""):
                    continue

                html = response.text
                text = _extract_text(html)

                if len(text.strip()) < 100:
                    continue

                all_texts.append(text)
                all_metadatas.append({
                    "source": current_url,
                    "source_type": "web",
                    "title": BeautifulSoup(html, "html.parser").title.string if BeautifulSoup(html, "html.parser").title else current_url,
                })

                # Discover more links
                if current_depth < depth:
                    links = _get_links(html, current_url)
                    for link in links:
                        if link not in visited:
                            queue.append((link, current_depth + 1))

                await asyncio.sleep(0.5)  # Polite crawl delay

            except Exception as e:
                logger.warning(f"Failed to crawl {current_url}: {e}")

    if not all_texts:
        raise ValueError(f"No content extracted from {url}")

    # Split and ingest
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
    )

    chunks = []
    chunk_metas = []
    for text, meta in zip(all_texts, all_metadatas):
        splits = splitter.split_text(text)
        for i, split in enumerate(splits):
            chunks.append(split)
            chunk_metas.append({**meta, "chunk_index": i})

    ids = await add_documents(chunks, chunk_metas)
    logger.info(f"Crawled {len(visited)} pages, ingested {len(ids)} chunks")

    return {"pages_crawled": len(visited), "chunks": len(ids)}
