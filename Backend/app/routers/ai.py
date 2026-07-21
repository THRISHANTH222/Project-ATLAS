from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import get_current_user
from app.models.request.ai import PromptRequest, StructuredAnalysisRequest, RetrievalQARequest
from app.models.response.base import ApiResponse
from app.prompts.templates import PromptBuilder
from app.services import get_ai_service, get_db_service, get_retrieval_service
from app.services.base import IAIService, IDatabaseService, IRetrievalService
from app.utils.exceptions import ValidationError

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


@router.post("/prompt-qa", response_model=ApiResponse[str])
async def retrieval_qa_prompt(
    payload: RetrievalQARequest,
    current_user: dict = Depends(get_current_user),
    ai: IAIService = Depends(get_ai_service),
    retrieval: IRetrievalService = Depends(get_retrieval_service),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[str]:
    """
    RAG-augmented Q&A endpoint.
    Retrieves chunks, builds context prompt using PromptBuilder, and queries Gemini.
    """
    company_id = current_user.get("tenant_id") or current_user.get("company_id")
    if not company_id:
        raise ValidationError("Authentication context does not contain a valid tenant/company association.")

    # 1. Retrieve company details
    from app.config.settings import get_settings
    db_service = get_db_service(get_settings())
    company_data = await db_service.get_document("companies", company_id)

    # 2. Retrieve top matching document chunks
    chunks = await retrieval.retrieve_relevant_chunks(
        company_id=company_id,
        query=payload.query,
        top_k=payload.top_k
    )

    # 3. Build prompt
    prompt = PromptBuilder.build_retrieval_prompt(
        chunks=chunks,
        question=payload.query,
        company_knowledge=company_data,
        system_instructions=payload.system_instruction
    )

    # 4. Generate answer from Gemini
    answer = await ai.generate_content(prompt=prompt)

    return ApiResponse(
        status="success",
        success=True,
        message="Retrieval-augmented QA completed.",
        data=answer
    )
