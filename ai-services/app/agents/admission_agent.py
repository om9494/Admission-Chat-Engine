"""
MCP-style Admission Agent.
Orchestrates multiple tools to answer complex admission queries.
"""

import logging
from langchain.agents import AgentExecutor, create_react_agent
from langchain.prompts import PromptTemplate
from langchain.tools import Tool
from app.core.llm import get_llm
from app.agents.tools.rag_tool import rag_search_tool
from app.agents.tools.deadline_tool import deadline_lookup_tool
from app.agents.tools.eligibility_tool import eligibility_check_tool

logger = logging.getLogger(__name__)

AGENT_PROMPT = PromptTemplate.from_template("""
You are an expert university admission assistant. Use the available tools to answer questions accurately.
Always cite your sources when using retrieved information.

Tools available:
{tools}

Tool names: {tool_names}

Use this format:
Question: the input question
Thought: think about what to do
Action: tool name
Action Input: input to the tool
Observation: tool result
... (repeat as needed)
Thought: I now know the final answer
Final Answer: the answer to the question

Question: {input}
{agent_scratchpad}
""")


class AdmissionAgent:
    """
    MCP-style agent that routes admission queries to specialized tools.
    """

    def __init__(self):
        self.llm = get_llm(temperature=0.0)
        self.tools = [
            rag_search_tool,
            deadline_lookup_tool,
            eligibility_check_tool,
        ]
        agent = create_react_agent(self.llm, self.tools, AGENT_PROMPT)
        self.executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            max_iterations=5,
            handle_parsing_errors=True,
        )

    async def run(self, query: str) -> dict:
        """Run the agent on a query and return the result."""
        try:
            result = self.executor.invoke({"input": query})
            return {"answer": result["output"], "sources": []}
        except Exception as e:
            logger.error(f"Agent error: {e}", exc_info=True)
            return {"answer": "I encountered an error processing your request.", "sources": []}
