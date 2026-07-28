from fastapi import APIRouter, Depends, status
from app.config.settings import get_settings
from app.middleware.auth_middleware import get_current_user
from app.models.response.base import ApiResponse
from app.models.response.documents import DocumentDownloadResponse
from app.services import get_db_service, get_storage_service
from app.services.base import IDatabaseService, IStorageService
from app.utils.exceptions import NotFoundError, AuthorizationError, ValidationError, StorageError, AppException
from app.utils.logger import get_logger

router = APIRouter(prefix="/documents", tags=["Document Manager"])
logger = get_logger("app.routers.documents")


@router.get(
    "",
    response_model=ApiResponse[list],
    status_code=status.HTTP_200_OK,
    summary="List company documents",
    description="Retrieves all document metadata records for the authenticated tenant company.",
)
async def list_documents(
    current_user: dict = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[list]:
    """
    HTTP Handler to query all document metadata for the user's company tenant.
    """
    user_company_id = current_user.get("tenant_id") or current_user.get("company_id") or "comp-atlas"
    docs = await db.query_documents("documents", "companyId", "==", user_company_id)
    if not docs:
        docs = await db.query_documents("documents", "company_id", "==", user_company_id)
    return ApiResponse(
        status="success",
        success=True,
        message="Company documents retrieved successfully.",
        data=docs
    )


@router.get(
    "/{document_id}",
    response_model=ApiResponse[DocumentDownloadResponse],
    status_code=status.HTTP_200_OK,
    summary="Get document download URL",
    description="Retrieves a secure, temporary signed download URL for a document if the user is authorized.",
)
async def get_document_download_url(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
    storage: IStorageService = Depends(get_storage_service)
) -> ApiResponse[DocumentDownloadResponse]:
    """
    HTTP Handler to retrieve a signed download URL for a document.
    Validates document existence, tenant authorization, and active storage path.
    """
    logger.info(f"Download request received for document ID: '{document_id}'")

    if not document_id or not document_id.strip():
        logger.warning("Download request rejected: document_id is empty.")
        raise ValidationError("Document ID must be provided.")

    # 1. Fetch metadata from Firestore (source of truth)
    logger.info(f"Querying Firestore for document metadata: '{document_id}'")
    doc_metadata = await db.get_document("documents", document_id)
    if not doc_metadata:
        logger.warning(f"Download rejected: metadata not found for document ID '{document_id}'.")
        raise NotFoundError(f"Document with ID '{document_id}' not found.")

    # 2. Extract tenant context and validate authorization
    doc_company_id = doc_metadata.get("companyId") or doc_metadata.get("company_id")
    user_company_id = current_user.get("tenant_id") or current_user.get("company_id")
    user_uid = current_user.get("uid") or "unknown_user"

    if not user_company_id:
        logger.warning(f"Download rejected: user '{user_uid}' has no tenant association.")
        raise AuthorizationError("Your user account is not associated with any tenant company.")

    if doc_company_id != user_company_id:
        logger.warning(
            f"Download unauthorized: user '{user_uid}' (Company: {user_company_id}) "
            f"attempted to access document '{document_id}' owned by company '{doc_company_id}'."
        )
        raise AuthorizationError("You do not have permission to access this document.")

    # 3. Retrieve storagePath from metadata
    storage_path = doc_metadata.get("storagePath") or doc_metadata.get("storage_path")
    if not storage_path:
        logger.error(f"Metadata corruption: document '{document_id}' has no storage path registered.")
        raise NotFoundError("The requested document is missing its storage path registration.")

    # 4. Check if the file actually exists in storage before generating signed URL
    logger.info(f"Checking file existence in storage bucket: '{storage_path}'")
    file_exists = await storage.exists(storage_path)
    if not file_exists:
        logger.error(f"Storage mismatch: file '{storage_path}' is missing from the storage bucket.")
        raise NotFoundError("The document file could not be found in storage.")

    # 5. Generate signed URL
    settings = get_settings()
    expiration = settings.SIGNED_URL_EXPIRATION
    logger.info(f"Generating signed URL for path: '{storage_path}' with expiration: {expiration}s")
    
    try:
        signed_url = await storage.generate_signed_url(storage_path, expiration_seconds=expiration)
    except Exception as e:
        logger.error(f"Failed to generate signed URL for document '{document_id}': {e}")
        raise StorageError(f"Failed to generate secure download URL: {str(e)}")

    logger.info(f"Successfully generated signed download URL for document ID '{document_id}'.")

    response_data = DocumentDownloadResponse(
        documentId=document_id,
        filename=doc_metadata.get("filename") or "downloaded_file",
        downloadUrl=signed_url,
        expiresIn=expiration
    )

    return ApiResponse(
        status="success",
        success=True,
        message="Signed download URL generated successfully.",
        data=response_data
    )


@router.delete(
    "/{document_id}",
    response_model=ApiResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete a document",
    description="Deletes a document from both storage and Firestore metadata collections.",
)
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
    storage: IStorageService = Depends(get_storage_service)
) -> ApiResponse[None]:
    """
    HTTP Handler to delete a document.
    Ensures user is authenticated, belongs to the owning company, deletes storage file,
    and removes Firestore metadata records with transaction-safety reporting.
    """
    logger.info(f"Delete request received for document ID: '{document_id}'")

    if not document_id or not document_id.strip():
        logger.warning("Delete request rejected: document_id is empty.")
        raise ValidationError("Document ID must be provided.")

    # 1. Fetch metadata from Firestore
    logger.info(f"Querying Firestore for document metadata to delete: '{document_id}'")
    doc_metadata = await db.get_document("documents", document_id)
    if not doc_metadata:
        logger.warning(f"Delete rejected: metadata not found for document ID '{document_id}'.")
        raise NotFoundError(f"Document with ID '{document_id}' not found.")

    # 2. Extract tenant context and validate authorization
    doc_company_id = doc_metadata.get("companyId") or doc_metadata.get("company_id")
    user_company_id = current_user.get("tenant_id") or current_user.get("company_id")
    user_uid = current_user.get("uid") or "unknown_user"

    if not user_company_id:
        logger.warning(f"Delete rejected: user '{user_uid}' has no tenant association.")
        raise AuthorizationError("Your user account is not associated with any tenant company.")

    if doc_company_id != user_company_id:
        logger.warning(
            f"Delete unauthorized: user '{user_uid}' (Company: {user_company_id}) "
            f"attempted to delete document '{document_id}' owned by company '{doc_company_id}'."
        )
        raise AuthorizationError("You do not have permission to delete this document.")

    # 3. Retrieve storagePath from metadata
    storage_path = doc_metadata.get("storagePath") or doc_metadata.get("storage_path")
    if not storage_path:
        logger.error(f"Metadata corruption: document '{document_id}' has no storage path registered.")
        raise NotFoundError("The requested document is missing its storage path registration.")

    # 4. Check if the file actually exists in storage
    logger.info(f"Checking file existence in storage bucket: '{storage_path}'")
    file_exists = await storage.exists(storage_path)
    if not file_exists:
        logger.warning(f"Storage file '{storage_path}' does not exist in the bucket. Proceeding to metadata deletion.")

    # 5. Delete file from storage first
    if file_exists:
        try:
            logger.info(f"Deleting storage object: '{storage_path}'")
            await storage.delete_file(storage_path)
        except Exception as e:
            logger.error(f"Failed to delete storage file '{storage_path}': {e}")
            raise StorageError(f"Failed to delete storage object: {str(e)}")

    # 6. Delete metadata from Firestore (source of truth)
    try:
        logger.info(f"Deleting Firestore document metadata for document ID: '{document_id}'")
        await db.delete_document("documents", document_id)
        
        # Proactively clean up duplicate collection entries from "uploads" if present
        try:
            await db.delete_document("uploads", document_id)
        except Exception:
            logger.debug(f"Optional 'uploads' document not found or could not be deleted for ID: '{document_id}'")

        # Purge associated vector chunks to prevent orphan chunks in Firestore
        try:
            doc_chunks = await db.query_documents("chunks", "documentId", "==", document_id)
            if not doc_chunks:
                doc_chunks = await db.query_documents("chunks", "document_id", "==", document_id)
            for chunk_record in doc_chunks:
                cid = chunk_record.get("chunkId") or chunk_record.get("chunk_id") or chunk_record.get("id")
                if cid:
                    await db.delete_document("chunks", cid)
            logger.info(f"Cleaned up {len(doc_chunks)} vector chunks for document ID: '{document_id}'")
        except Exception as chunk_err:
            logger.warning(f"Chunk cleanup warning for document '{document_id}': {chunk_err}")
            
    except Exception as e:
        logger.critical(
            f"INCONSISTENT STATE: Storage file '{storage_path}' was deleted successfully, "
            f"but Firestore metadata for document ID '{document_id}' could not be deleted: {e}"
        )
        raise AppException(
            status_code=500,
            title="Data Inconsistency Error",
            detail=(
                f"Storage file was deleted, but Firestore metadata cleanup failed. "
                f"System is in an inconsistent state. Error: {str(e)}"
            ),
            error_code="DATA_INCONSISTENCY"
        )

    logger.info(f"Successfully deleted document ID '{document_id}' and storage path '{storage_path}'.")

    return ApiResponse(
        status="success",
        success=True,
        message="Document deleted successfully.",
        data=None
    )
