from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PromptRequest(BaseModel):
    """Parameters for AI Content Generation via Gemini."""

    prompt: str = Field(..., min_length=3, description="User prompt text to submit to the model")
    system_instruction: Optional[str] = Field(None, description="Optional override instruction to control personality/behavior")
    chat_history: Optional[List[Dict[str, Any]]] = Field(None, description="Optional conversation context history list")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "Summarize the key growth drivers for SaaS companies in 2026.",
                "system_instruction": "You are a professional business analyst. Speak clearly and concisely.",
                "chat_history": []
            }
        }
    )


class StructuredAnalysisRequest(BaseModel):
    """Parameters for parsing raw data into custom structured JSON layouts using Gemini."""

    raw_text: str = Field(..., description="The raw unformatted text to analyze")
    analysis_type: str = Field(default="generic", description="Purpose of parsing (e.g. invoice, resume, logs)")
    schema_definition: Dict[str, Any] = Field(..., description="JSON-Schema specifying the output dictionary requirements")
