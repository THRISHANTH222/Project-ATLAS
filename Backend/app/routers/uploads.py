from typing import Optional, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from fastapi.responses import JSONResponse

from app.middleware.auth_middleware import get_current_user
from app.models.response.base import ApiResponse
from app.models.response.uploads import UploadMetadataResponse
from app.services import get_db_service, get_storage_service, get_document_validator, get_ai_service
from app.services.base import IDatabaseService, IStorageService, IAIService
from app.services.upload_service import UploadService
from app.utils.exceptions import ValidationError
from app.utils.logger import get_logger

router = APIRouter(prefix="/uploads", tags=["Upload Manager"])
logger = get_logger("app.routers.uploads")

@router.post(
    "",
    response_model=ApiResponse[UploadMetadataResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description=(
        "Uploads a document (PDF, DOCX, TXT, or XLSX) to the active storage provider and records metadata in Firestore. "
        "Performs file type validation, size checking (max 10MB), and runs a Document Validation Agent that extracts "
        "the first 3 pages / 5000 characters and uses Groq to classify the taxonomy.\n\n"
        "**Accepted categories:** SOP, HR Policy, Employee Handbook, Company Policy, Product Manual, Technical Documentation, "
        "Finance Policy, Compliance, Legal, Operations, Sales, Internal Knowledge Base.\n"
        "**Rejected categories:** Study Notes, Academic PDFs, Assignments, Textbooks, Fiction, Personal Documents.\n\n"
        "Documents with **confidence below 0.85** or matching a rejected class are immediately blocked (HTTP 400)."
    ),
    responses={
        400: {
            "description": "Unsupported document or validation check fail",
            "content": {
                "application/json": {
                    "example": {
                        "error": "Unsupported document",
                        "reason": "This appears to be academic study material. Atlas only accepts company knowledge documents."
                    }
                }
            }
        }
    }
)
async def upload_document(
    file: UploadFile = File(..., description="Multipart file stream to upload"),
    folder: Optional[str] = Form("uploads", description="Subfolder structure under the company root directory"),
    current_user: dict = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
    storage: IStorageService = Depends(get_storage_service),
    validator: Any = Depends(get_document_validator),
    ai: IAIService = Depends(get_ai_service)
) -> Any:
    """
    HTTP Handler for uploading files. Extracts authentication context, validates document taxonomy, and uploads content.
    """
    # Infer companyId from current authenticated user context
    company_id = current_user.get("tenant_id") or current_user.get("company_id")
    user_uid = current_user.get("uid") or "unknown_user"

    if not company_id:
        logger.warning(f"Upload attempted by UID '{user_uid}' without a valid tenant association.")
        raise ValidationError("Authentication context does not contain a valid tenant/company association.")

    logger.info(f"Incoming upload request: '{file.filename}' (Type: {file.content_type}) from user '{user_uid}' (Company: {company_id})")

    # Read uploaded file content
    file_bytes = await file.read()

    # Pre-validate file taxonomy (only allow organizational knowledge documents)
    validation = await validator.validate_document(
        file_content=file_bytes,
        filename=file.filename or "unnamed_file",
        content_type=file.content_type or "application/octet-stream"
    )

    if not validation.accepted or validation.confidence < 0.85:
        logger.warning(
            f"Upload validation rejected for file '{file.filename}'. "
            f"Accepted: {validation.accepted}, Confidence: {validation.confidence}. "
            f"Reason: {validation.reason}"
        )
        return JSONResponse(
            status_code=400,
            content={
                "error": "Unsupported document",
                "reason": (
                    validation.reason 
                    if not validation.accepted 
                    else "This appears to be academic study material. Atlas only accepts company knowledge documents."
                )
            }
        )

    # Instantiate logic service
    upload_service = UploadService(db=db, storage=storage)

    # Process file validation, deduplication, and uploads
    metadata_dict = await upload_service.handle_upload(
        file_content=file_bytes,
        filename=file.filename or "unnamed_file",
        content_type=file.content_type or "application/octet-stream",
        company_id=company_id,
        uploaded_by=user_uid,
        folder=folder
    )

    # Trigger automated ingestion pipeline with AI embeddings
    import asyncio
    asyncio.create_task(
        upload_service.process_ingestion_pipeline(
            file_content=file_bytes,
            document_id=metadata_dict.get("documentId") or metadata_dict.get("id"),
            company_id=company_id,
            filename=metadata_dict.get("filename") or file.filename or "unnamed_file",
            content_type=file.content_type or "application/octet-stream",
            ai_service=ai
        )
    )

    # Wrap in Pydantic response schema
    response_data = UploadMetadataResponse(**metadata_dict)

    return ApiResponse(
        status="success",
        success=True,
        message="Document uploaded successfully.",
        data=response_data
    )
