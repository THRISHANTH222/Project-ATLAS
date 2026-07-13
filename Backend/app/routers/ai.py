from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import get_current_user
from app.models.request.ai import PromptRequest, StructuredAnalysisRequest
from app.models.response.base import ApiResponse
from app.prompts.templates import PromptBuilder
from app.services import get_ai_service
from app.services.base import IAIService

router = APIRouter(prefix="/ai", tags=["Gemini AI Integration"])


@router.post("/chat", response_model=ApiResponse[str])
async def process_chat_prompt(
    payload: PromptRequest,
    current_user: dict = Depends(get_current_user),
    ai: IAIService = Depends(get_ai_service),
) -> ApiResponse[str]:
    """
    Triggers text content generation using Gemini.
    Accepts history for interactive multi-turn conversations and system overrides.
    """
    # Use template default system instructions if none is specified
    system_instruction = payload.system_instruction or PromptBuilder.get_system_instruction("generic")

    response_text = await ai.generate_content(
        prompt=payload.prompt,
        system_instruction=system_instruction,
        history=payload.chat_history,
    )
    return ApiResponse(status="success", message="AI processing complete", data=response_text)


@router.post("/analyze", response_model=ApiResponse[dict])
async def parse_unstructured_text(
    payload: StructuredAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    ai: IAIService = Depends(get_ai_service),
) -> ApiResponse[dict]:
    """
    Parses unstructured inputs (e.g. log files, invoices, raw reports)
    into standard JSON dictionaries conforming to a specific schema payload.
    """
    system_instruction = PromptBuilder.get_system_instruction("analyst")

    structured_data = await ai.generate_json(
        prompt=payload.raw_text,
        response_schema=payload.schema_definition,
        system_instruction=system_instruction,
    )
    return ApiResponse(
        status="success",
        message="Structured analysis extracted successfully",
        data=structured_data,
    )
