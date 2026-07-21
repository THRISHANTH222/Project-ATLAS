from typing import List
from fastapi import APIRouter, Depends, status

from app.middleware.auth_middleware import get_current_user
from app.models.request.retrieval import RetrievalRequest
from app.models.response.base import ApiResponse
from app.models.response.retrieval import RetrievalChunkResponse
from app.services import get_retrieval_service
from app.services.base import IRetrievalService
from app.utils.exceptions import ValidationError
from app.utils.logger import get_logger

router = APIRouter(prefix="/retrieval", tags=["Knowledge Retrieval Engine"])
logger = get_logger("app.routers.retrieval")


@router.post(
    "/query",
    response_model=ApiResponse[List[RetrievalChunkResponse]],
    status_code=status.HTTP_200_OK,
    summary="Retrieve relevant document chunks",
    description=(
        "Accepts a user query, generates its vector embedding representation, "
        "and retrieves the top K most relevant matching document chunks using cosine vector similarity. "
        "Strictly enforces multi-tenant boundaries using the user's company context."
    )
)
async def query_relevant_chunks(
    payload: RetrievalRequest,
    current_user: dict = Depends(get_current_user),
    retrieval: IRetrievalService = Depends(get_retrieval_service)
) -> ApiResponse[List[RetrievalChunkResponse]]:
    """
    HTTP Router endpoint mapping matching chunk records from Firestore index.
    """
    # Extract company association context
    company_id = current_user.get("tenant_id") or current_user.get("company_id")
    user_uid = current_user.get("uid") or "unknown_user"

    if not company_id:
        logger.warning(f"Retrieval query rejected: User '{user_uid}' lacks tenant/company association.")
        raise ValidationError("Authentication context does not contain a valid tenant/company association.")

    logger.info(
        f"Incoming retrieval query request from user '{user_uid}' "
        f"(Company: {company_id}) with query '{payload.query[:50]}...'"
    )

    # Invoke the modular retrieval engine service
    results = await retrieval.retrieve_relevant_chunks(
        company_id=company_id,
        query=payload.query,
        top_k=payload.top_k
    )

    # Map output elements to schema representations
    response_chunks = [
        RetrievalChunkResponse(
            chunkId=item["chunkId"],
            documentId=item["documentId"],
            documentName=item.get("documentName"),
            page=item.get("page"),
            similarity=item["similarity"],
            text=item["text"],
            # Legacy mapping support
            pageNumber=item.get("pageNumber"),
            similarityScore=item.get("similarityScore"),
            chunkText=item.get("chunkText")
        )
        for item in results
    ]

    return ApiResponse(
        status="success",
        success=True,
        message="Relevant document chunks retrieved successfully.",
        data=response_chunks
    )
