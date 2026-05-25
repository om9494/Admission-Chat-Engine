"""
Eligibility check tool for the admission agent.
"""

from langchain.tools import Tool
from app.core.vector_store import get_vector_store
from app.config import settings


def _eligibility_check(query: str) -> str:
    """Check eligibility requirements for admission."""
    search_query = f"eligibility requirements GPA minimum score {query}"
    try:
        vs = get_vector_store()
        results = vs.similarity_search_with_relevance_scores(search_query, k=3)
        filtered = [doc for doc, score in results if score >= settings.RAG_SCORE_THRESHOLD]
        if not filtered:
            return "No eligibility information found. Please contact the admissions office directly."
        return "\n\n".join([doc.page_content for doc in filtered])
    except Exception as e:
        return f"Eligibility check failed: {str(e)}"


eligibility_check_tool = Tool(
    name="eligibility_checker",
    func=_eligibility_check,
    description=(
        "Check admission eligibility requirements for a program. "
        "Input should describe the student's background or the program they're interested in."
    ),
)
