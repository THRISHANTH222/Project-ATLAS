from fastapi import APIRouter, Depends
from typing import List
import datetime

from app.middleware.auth_middleware import get_current_user
from app.models.request.ai import PromptRequest, StructuredAnalysisRequest, RetrievalQARequest
from app.models.response.base import ApiResponse
from app.models.response.ai import ChatResponse, SourceCitation, ChatHistoryRecord
from app.prompts.templates import PromptBuilder
from app.services import get_ai_service, get_db_service, get_retrieval_service
from app.services.base import IAIService, IDatabaseService, IRetrievalService
from app.utils.exceptions import ValidationError, NotFoundError, AuthorizationError

router = APIRouter(prefix="/ai", tags=["Gemini AI Integration"])


def calculate_rag_confidence(chunks: List[dict]) -> float:
    """
    Calculates a multi-factor RAG confidence score from 0.0 to 100.0%
    incorporating Average Similarity, Chunk Quality, and Context Coverage.
    """
    if not chunks:
        return 0.0

    # 1. Average Similarity
    similarities = []
    for c in chunks:
        try:
            score = float(c.get("similarity") or c.get("similarityScore") or 0.0)
            similarities.append(max(0.0, min(1.0, score)))
        except (ValueError, TypeError):
            similarities.append(0.0)
    avg_similarity = sum(similarities) / len(similarities) if similarities else 0.0

    # 2. Chunk Quality
    quality_scores = []
    for c in chunks:
        text = c.get("text") or c.get("chunkText") or c.get("content") or ""
        length = len(text.strip())
        if length == 0:
            quality_scores.append(0.0)
        elif length < 100:
            quality_scores.append(0.5)
        elif length > 1200:
            quality_scores.append(0.8)
        else:
            quality_scores.append(1.0)
    avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0

    # 3. Context Coverage
    coverage = min(1.0, len(chunks) / 5.0)

    # Weighted Average Score: 50% Similarity, 30% Quality, 20% Coverage
    weighted_score = (avg_similarity * 0.5) + (avg_quality * 0.3) + (coverage * 0.2)

    confidence_pct = min(100.0, max(0.0, weighted_score * 100.0))
    return round(confidence_pct, 1)


@router.post("/chat", response_model=ApiResponse[ChatResponse])
async def process_chat_prompt(
    payload: PromptRequest,
    current_user: dict = Depends(get_current_user),
    ai: IAIService = Depends(get_ai_service),
    retrieval: IRetrievalService = Depends(get_retrieval_service),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[ChatResponse]:
    """
    RAG-augmented Q&A Chatbot endpoint.
    Retrieves candidate chunks, builds context prompt, calls Gemini, and returns citations and confidence metrics.
    """
    company_id = current_user.get("tenant_id") or current_user.get("company_id")
    if not company_id:
        raise ValidationError("Authentication context does not contain a valid tenant/company association.")

    # 1. Retrieve company details
    from app.config.settings import get_settings
    db_service = get_db_service(get_settings())
    company_data = await db_service.get_document("companies", company_id)

    # 2. Retrieve top matching document chunks (limit to 5)
    chunks = await retrieval.retrieve_relevant_chunks(
        company_id=company_id,
        query=payload.prompt,
        top_k=5
    )

    # 3. Build prompt
    prompt = PromptBuilder.build_retrieval_prompt(
        chunks=chunks,
        question=payload.prompt,
        company_knowledge=company_data,
        system_instructions=payload.system_instruction
    )

    # 4. Generate answer from Gemini
    answer = await ai.generate_content(prompt=prompt)

    # 5. Extract structured citations list and maximum similarity score (confidence)
    citations = []
    for chunk in chunks:
        chunk_id = chunk.get("chunkId") or chunk.get("chunk_id") or "unknown-chunk"
        doc_name = chunk.get("documentName") or chunk.get("document_name") or chunk.get("filename") or "unknown-doc"
        page = chunk.get("page") or chunk.get("pageNumber") or chunk.get("page_number")
        text = chunk.get("text") or chunk.get("chunkText") or chunk.get("content") or ""
        score = chunk.get("similarity") or chunk.get("similarityScore") or 0.0
        try:
            score_val = float(score)
        except (ValueError, TypeError):
            score_val = 0.0

        citation_item = SourceCitation(
            documentName=doc_name,
            page=page,
            chunkId=chunk_id,
            text=text,
            similarity=score_val,
            # Legacy copies
            document_name=doc_name,
            page_number=page,
            chunk_text=text,
            similarity_score=score_val
        )
        citations.append(citation_item)

    # Calculate multi-factor confidence percentage score (0-100%)
    confidence_score = calculate_rag_confidence(chunks)

    chat_res = ChatResponse(
        answer=answer,
        citations=citations,
        confidence=confidence_score
    )

    # 6. Save chat session history record in Firestore
    citations_data = [cit.model_dump() for cit in citations]
    session_record = {
        "question": payload.prompt,
        "answer": answer,
        "citations": citations_data,
        "confidence": confidence_score,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "companyId": company_id,
        "userId": current_user.get("uid") or current_user.get("userId") or "unknown-user"
    }
    await db.create_document("chat_sessions", session_record)

    return ApiResponse(
        status="success",
        success=True,
        message="AI chat processing complete",
        data=chat_res
    )


@router.get("/chat/history", response_model=ApiResponse[List[ChatHistoryRecord]])
async def get_chat_history(
    current_user: dict = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[List[ChatHistoryRecord]]:
    """Responds with list of past chats for the authenticated user/company."""
    company_id = current_user.get("tenant_id") or current_user.get("company_id")
    if not company_id:
        raise ValidationError("Authentication context does not contain a valid tenant/company association.")

    user_id = current_user.get("uid") or current_user.get("userId")

    # Retrieve all chat history logs matching this company
    sessions = await db.query_documents("chat_sessions", "companyId", "==", company_id)

    # Filter in-memory to guarantee user isolation, and map to ChatHistoryRecord
    history_records = []
    for s in sessions:
        if s.get("userId") == user_id:
            history_records.append(
                ChatHistoryRecord(
                    id=s.get("id") or "unknown-id",
                    question=s.get("question") or "",
                    answer=s.get("answer") or "",
                    citations=[SourceCitation(**cit) for cit in s.get("citations", [])],
                    confidence=float(s.get("confidence", 0.0)),
                    timestamp=s.get("timestamp") or "",
                    companyId=s.get("companyId") or "",
                    userId=s.get("userId") or ""
                )
            )

    # Sort secondary by timestamp descending (newest first)
    history_records.sort(key=lambda x: x.timestamp, reverse=True)

    return ApiResponse(
        status="success",
        success=True,
        message="Chat history list retrieved successfully",
        data=history_records
    )


@router.delete("/chat/history/{id}", response_model=ApiResponse[None])
async def delete_chat_history(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[None]:
    """Deletes a chat history log from the database."""
    company_id = current_user.get("tenant_id") or current_user.get("company_id")
    user_id = current_user.get("uid") or current_user.get("userId")
    if not company_id:
        raise ValidationError("Authentication context does not contain a valid tenant/company association.")

    # Retrieve matching document to verify ownership properties
    doc = await db.get_document("chat_sessions", id)
    if not doc:
        raise NotFoundError(f"Chat session logs with ID {id} not found.")

    # Isolation safety check
    if doc.get("companyId") != company_id or doc.get("userId") != user_id:
        raise AuthorizationError("Access Denied: You do not have permissions to modify this chat history resource.")

    # Complete DB purge
    await db.delete_document("chat_sessions", id)

    return ApiResponse(
        status="success",
        success=True,
        message=f"Chat history document {id} deleted successfully",
        data=None
    )


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


@router.get("/chat/debug", response_model=ApiResponse[dict])
async def chat_debug_endpoint(
    query: str,
    current_user: dict = Depends(get_current_user),
    retrieval: IRetrievalService = Depends(get_retrieval_service),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[dict]:
    """
    Developer-only retrieval debug mode.
    Runs similarity analysis, reranking parameters, prompt assembly calculations, 
    and returns granular inspection metrics.
    """
    import time

    # Security Check: Developer only
    roles = current_user.get("roles") or current_user.get("firebase", {}).get("roles") or []
    is_dev = any(r in ["developer", "admin", "dev"] for r in roles)
    uid = str(current_user.get("uid", "")).lower()
    email = str(current_user.get("email", "")).lower()
    if not is_dev and not any(wd in uid or wd in email for wd in ["dev", "admin", "developer"]):
       raise AuthorizationError("Access Denied: Developer only endpoint.")

    company_id = current_user.get("tenant_id") or current_user.get("company_id")
    if not company_id:
        raise ValidationError("Authentication context does not contain a valid tenant/company association.")

    # Start Timer
    start_time = time.perf_counter()

    # 1. Retrieve top matching document chunks (limit to 5)
    chunks = await retrieval.retrieve_relevant_chunks(
        company_id=company_id,
        query=query,
        top_k=5
    )

    # 2. Retrieve company details
    from app.config.settings import get_settings
    db_service = get_db_service(get_settings())
    company_data = await db_service.get_document("companies", company_id)

    # 3. Formulate Prompt Builder context (to measure prompt length)
    prompt = PromptBuilder.build_retrieval_prompt(
        chunks=chunks,
        question=query,
        company_knowledge=company_data
    )

    # Calculate metrics
    prompt_length = len(prompt)
    confidence_score = calculate_rag_confidence(chunks)
    
    # Calculate Average Embedding/Similarity Score
    similarities = [float(c.get("similarity", 0.0)) for c in chunks]
    avg_embedding_score = sum(similarities) / len(similarities) if similarities else 0.0

    # Format Retrieved Chunks details
    retrieved_chunks = [
        {
            "similarity": float(c.get("similarity", 0.0)),
            "page": int(c.get("page", 1)) if c.get("page") is not None else 1,
            "heading": c.get("heading") or "",
            "chunkId": c.get("chunkId") or "unknown"
        }
        for c in chunks
    ]

    # Stop Timer
    end_time = time.perf_counter()
    response_time_ms = round((end_time - start_time) * 1000.0, 2)

    debug_data = {
        "query": query,
        "embeddingScore": avg_embedding_score,
        "retrievedChunks": retrieved_chunks,
        "responseTime": response_time_ms,
        "confidence": confidence_score,
        "promptLength": prompt_length
    }

    return ApiResponse(
        status="success",
        success=True,
        message="Retrieval debug analysis retrieved successfully.",
        data=debug_data
    )

