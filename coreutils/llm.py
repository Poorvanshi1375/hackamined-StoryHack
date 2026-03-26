"""
coreutils/llm.py
----------------
Centralised LLM client shared across all coreutils agents.
Import `llm` from here rather than constructing a new instance in each module.
"""

from langchain_groq import ChatGroq

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.3,
)
