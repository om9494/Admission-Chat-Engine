"""
Deadline lookup tool for the admission agent.
Queries the knowledge base specifically for deadline information.
"""

from langchain.tools import Tool
from app.core.vector_store import get_vector_store
from app.config import settings


def _deadline_lookup(program: str) -> str:
    """Look up admission deadlines for a specific program."""
    query = f"admission deadline application deadline {program}"
    try:
        vs = get_vector_store()
        results = vs.similarity_search_with_relevance_scores(query, k=3)
        filtered = [doc for doc, score in results if score >= settings.RAG_SCORE_THRESHOLD]
        if not filtered:
            return f"No deadline information found for '{program}'. Please contact the admissions office."
        return "\n\n".join([doc.page_content for doc in filtered])
    except Exception as e:
        return f"Deadline lookup failed: {str(e)}"


deadline_lookup_tool = Tool(
    name="deadline_lookup",
    func=_deadline_lookup,
    description=(
        "Look up application deadlines for a specific program or semester. "
        "Input should be the program name or 'fall semester', 'spring semester', etc."
    ),
)
