"""
Groq LLM client and RAG chain setup via LangChain.
"""

from langchain_groq import ChatGroq
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# System prompt for the admission assistant
ADMISSION_SYSTEM_PROMPT = """You are a helpful and knowledgeable university admission assistant.
Use the following retrieved context to answer the student's question accurately.
If the context does not contain enough information, say so honestly and suggest contacting the admissions office.
Always be friendly, clear, and concise.
Respond in the same language as the user's question.

Context:
{context}

Chat History:
{chat_history}

Question: {question}

Answer:"""

ADMISSION_PROMPT = PromptTemplate(
    input_variables=["context", "chat_history", "question"],
    template=ADMISSION_SYSTEM_PROMPT,
)


def get_llm(temperature: float = 0.1) -> ChatGroq:
    """Return a configured Groq LLM instance."""
    return ChatGroq(
        groq_api_key=settings.GROQ_API_KEY,
        model_name=settings.GROQ_MODEL,
        temperature=temperature,
        max_tokens=2048,
    )


def build_rag_chain(retriever, memory: ConversationBufferWindowMemory | None = None):
    """Build a ConversationalRetrievalChain with the Groq LLM."""
    llm = get_llm()
    if memory is None:
        memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            k=10,
        )

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        combine_docs_chain_kwargs={"prompt": ADMISSION_PROMPT},
        return_source_documents=True,
        verbose=False,
    )
    return chain
