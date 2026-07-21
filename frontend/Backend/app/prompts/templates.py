from typing import Any, Dict

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
