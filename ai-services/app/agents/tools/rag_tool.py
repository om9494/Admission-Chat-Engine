"""
RAG search tool for the admission agent.
"""

from langchain.tools import Tool
from app.core.vector_store import get_vector_store
from app.config import settings


def _rag_search(query: str) -> str:
    """Search the admission knowledge base for relevant information."""
    try:
        vs = get_vector_store()
        results = vs.similarity_search_with_relevance_scores(query, k=settings.RAG_TOP_K)
        filtered = [
            (doc, score) for doc, score in results
            if score >= settings.RAG_SCORE_THRESHOLD
        ]
        if not filtered:
            return "No relevant information found in the knowledge base."
        return "\n\n".join([
            f"[Source: {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
            for doc, _ in filtered
        ])
    except Exception as e:
        return f"Knowledge base search failed: {str(e)}"


rag_search_tool = Tool(
    name="admission_knowledge_base",
    func=_rag_search,
    description=(
        "Search the university admission knowledge base for information about "
        "requirements, programs, deadlines, fees, and procedures. "
        "Input should be a specific question or topic."
    ),
)
