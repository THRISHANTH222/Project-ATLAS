from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status

from app.middleware.auth_middleware import get_current_user
from app.models.response.base import ApiResponse
from app.models.response.uploads import UploadMetadataResponse
from app.services import get_db_service, get_storage_service
from app.services.base import IDatabaseService, IStorageService
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
        "Performs file type validation, size checking (max 10MB), and duplicate detection via hashes."
    )
)
async def upload_document(
    file: UploadFile = File(..., description="Multipart file stream to upload"),
    folder: Optional[str] = Form("uploads", description="Subfolder structure under the company root directory"),
    current_user: dict = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
    storage: IStorageService = Depends(get_storage_service)
) -> ApiResponse[UploadMetadataResponse]:
    """
    HTTP Handler for uploading files. Extracts authentication context and delegates processing to UploadService.
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

    # Wrap in Pydantic response schema
    response_data = UploadMetadataResponse(**metadata_dict)

    return ApiResponse(
        status="success",
        success=True,
        message="Document uploaded successfully.",
        data=response_data
    )
