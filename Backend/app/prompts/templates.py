import re
from typing import Any, Dict, List, Optional, Union

# Standardized system prompts for different agent tasks
SYSTEM_PROMPTS: Dict[str, str] = {
    "analyst": (
        "You are an expert enterprise business analyst. Your job is to extract insights from raw text data. "
        "Maintain a highly structured, objective, and quantitative tone. Do not make claims you cannot support."
    ),
    "coder": (
        "You are a Senior Principal Software Engineer specializing in Python, FastAPI, and Clean Architecture. "
        "Write clean, pep8 compliant, modular, and production-ready snippets."
    ),
    "generic": (
        "You are a helpful AI assistant for Project Atlas. Focus on answering accurately and concisely."
    ),
}

# Standardized user prompt templates
PROMPT_TEMPLATES: Dict[str, str] = {
    "summarize": "Please summarize the following document, highlight key findings, and list actionable next steps:\n\n{text}",
    "extract_key_values": "Please extract the key-value attributes from the text below, focusing on dates, amounts, and organizations:\n\n{text}",
}


class PromptBuilder:
    """Helper class to load templates and inject values safely."""

    @staticmethod
    def build(template_name: str, **kwargs: Any) -> str:
        """Loads a template and formats it with keywords arguments."""
        template = PROMPT_TEMPLATES.get(template_name)
        if not template:
            raise KeyError(f"Prompt template '{template_name}' not found.")
        return template.format(**kwargs)

    @staticmethod
    def get_system_instruction(key: str) -> str:
        """Retrieves system instructions by role key."""
        return SYSTEM_PROMPTS.get(key, SYSTEM_PROMPTS["generic"])

    @staticmethod
    def build_retrieval_prompt(
        chunks: List[Dict[str, Any]],
        question: str,
        company_knowledge: Union[str, Dict[str, Any], Any] = None,
        system_instructions: Optional[str] = None
    ) -> str:
        """
        Accepts retrieved document chunks, user question, and optional company knowledge
        to construct a structured, hallucination-resistant prompt for Gemini.
        """
        # 1. System Instructions
        DEFAULT_SYSTEM_INSTRUCTIONS = (
            "You are a helpful AI assistant. Answer the user's question based strictly on the provided Company Knowledge and Retrieved Chunks.\n"
            "Rules:\n"
            "- Never hallucinate or assume facts that are not directly supported by the context.\n"
            "- If the answer cannot be determined or inferred from the provided context, explicitly state: "
            "'I do not have enough information to answer this question based on the retrieved documents.'\n"
            "- Cite the source chunk IDs (e.g., [chunk-xyz-1]) next to the sentences in your response where that information was used."
        )
        sys_instructs = (system_instructions or DEFAULT_SYSTEM_INSTRUCTIONS).strip()

        # 2. Company Knowledge Formatting
        if not company_knowledge:
            comp_know_str = "No company profile details available."
        elif isinstance(company_knowledge, str):
            comp_know_str = company_knowledge.strip()
        elif isinstance(company_knowledge, dict):
            parts = []
            for k, v in company_knowledge.items():
                if v is not None:
                    # Translate camelCase or snake_case key to clean Title Case
                    clean_key = re.sub(r'([A-Z])', r' \1', k).replace('_', ' ').strip().title()
                    parts.append(f"{clean_key}: {v}")
            comp_know_str = "\n".join(parts) if parts else "No company profile details available."
        elif hasattr(company_knowledge, "model_dump"):
            # Pydantic v2 support
            data = company_knowledge.model_dump(exclude_none=True)
            parts = []
            for k, v in data.items():
                clean_key = re.sub(r'([A-Z])', r' \1', k).replace('_', ' ').strip().title()
                parts.append(f"{clean_key}: {v}")
            comp_know_str = "\n".join(parts) if parts else "No company profile details available."
        else:
            comp_know_str = str(company_knowledge).strip()

        # 3. Retrieved Chunks Formatting
        if not chunks:
            chunks_str = "No relevant document chunks found."
        else:
            formatted_chunks = []
            for idx, chunk in enumerate(chunks):
                chunk_id = chunk.get("chunkId") or chunk.get("chunk_id") or f"chunk-{idx}"
                doc_id = chunk.get("documentId") or chunk.get("document_id") or "unknown"
                page = chunk.get("pageNumber") or chunk.get("page_number") or chunk.get("page")
                text = chunk.get("chunkText") or chunk.get("content") or chunk.get("text") or ""
                
                page_str = f" (Page {page})" if page else ""
                formatted_chunks.append(
                    f"--- Chunk ID: [{chunk_id}] (Doc: {doc_id}){page_str} ---\n{text.strip()}"
                )
            chunks_str = "\n\n".join(formatted_chunks)

        # 4. Construct Structured Prompt Template
        prompt = (
            "SYSTEM INSTRUCTIONS:\n"
            f"{sys_instructs}\n\n"
            "COMPANY KNOWLEDGE:\n"
            f"{comp_know_str}\n\n"
            "RETRIEVED CHUNKS:\n"
            f"{chunks_str}\n\n"
            "USER QUESTION:\n"
            f"{question}"
        )
        return prompt

