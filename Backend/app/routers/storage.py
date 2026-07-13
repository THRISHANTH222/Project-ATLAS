from fastapi import APIRouter, Depends, Query, UploadFile, File

from app.middleware.auth_middleware import get_current_user
from app.models.response.base import ApiResponse
from app.services import get_storage_service
from app.services.base import IStorageService

router = APIRouter(prefix="/storage", tags=["Cloud Storage"])


@router.get("/presigned-url", response_model=ApiResponse[str])
async def get_presigned_url(
    blob_name: str = Query(..., description="The relative path/name of the target file in the bucket"),
    method: str = Query("GET", description="HTTP verb allowing write or read permission (GET, PUT, POST)"),
    expiration: int = Query(3600, description="Expiration time in seconds"),
    current_user: dict = Depends(get_current_user),
    storage: IStorageService = Depends(get_storage_service),
) -> ApiResponse[str]:
    """
    Generates a secure presigned GCS URL.
    Enables frontend clients to download files directly from GCS or upload files
    safely without routing heavy multipart file streams through the app servers.
    """
    url = await storage.generate_presigned_url(
        blob_name=blob_name,
        expiration_seconds=expiration,
        method=method,
    )
    return ApiResponse(status="success", message="Presigned URL generated successfully", data=url)


@router.post("/upload", response_model=ApiResponse[str])
async def upload_direct_file(
    file: UploadFile = File(..., description="The multipart file to upload"),
    current_user: dict = Depends(get_current_user),
    storage: IStorageService = Depends(get_storage_service),
) -> ApiResponse[str]:
    """
    Uploads a file directly to Cloud Storage via the API server.
    Best for small assets, profile pictures, or server-generated logs.
    """
    file_bytes = await file.read()
    blob_name = f"users/{current_user.get('uid')}/{file.filename}"
    
    public_url = await storage.upload_file(
        file_content=file_bytes,
        destination_blob_name=blob_name,
        content_type=file.content_type,
    )
    return ApiResponse(
        status="success",
        message="File uploaded directly to storage bucket",
        data=public_url,
    )
