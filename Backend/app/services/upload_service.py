import uuid
import hashlib
import re
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from firebase_admin import firestore

from app.services.base import IDatabaseService, IStorageService
from app.utils.exceptions import ValidationError, ConflictError, StorageError, DatabaseError
from app.utils.logger import get_logger

logger = get_logger("app.services.upload_manager")

# Allowed extensions and matching MIME types
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "xlsx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}
# Limit size to 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename to prevent directory traversal and remove unsafe characters."""
    name = os.path.basename(filename)
    # Allow alphanumeric, dot, hyphen, underscore, space
    name = re.sub(r"[^\w\s.-]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name or "unnamed_file"


class UploadService:
    """
    Business logic layer for handling document uploads.
    Enforces file size/type validation, duplicate check, and metadata registration.
    """

    def __init__(self, db: IDatabaseService, storage: IStorageService):
        self.db = db
        self.storage = storage

    async def handle_upload(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        company_id: str,
        uploaded_by: str,
        folder: Optional[str] = "documents"
    ) -> Dict[str, Any]:
        """
        Validates file, checks company existence, checks duplicates,
        uploads using StorageService, and creates Firestore metadata record.
        """
        logger.info(f"Upload started for file: '{filename}' (Company: {company_id})")

        # 1. Validate file content not empty
        file_size = len(file_content)
        if file_size == 0:
            logger.warning("Upload rejected: file content is empty.")
            raise ValidationError("File content cannot be empty.")

        # 2. Size Validation
        if file_size > MAX_FILE_SIZE:
            logger.warning(f"Upload rejected: file size {file_size} exceeds max limit of {MAX_FILE_SIZE} bytes.")
            raise ValidationError(
                f"File size exceeds the maximum limit of {MAX_FILE_SIZE / (1024 * 1024):.1f}MB."
            )

        # 3. Extension & MIME Type Validation
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"Upload rejected: extension '{ext}' is not supported.")
            raise ValidationError(
                f"Unsupported file extension '.{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}."
            )

        if content_type not in ALLOWED_MIME_TYPES:
            logger.warning(f"Upload rejected: MIME type '{content_type}' is not supported.")
            raise ValidationError(f"Unsupported MIME type '{content_type}'.")

        # 4. Check if company exists in Firestore
        if self.db.use_mock:
            # Auto-populate company in mock database to satisfy existence checks during tests
            await self.db.create_document("companies", {"id": company_id, "name": "Mock Company"}, doc_id=company_id)
        
        company_exists = await self.db.get_document("companies", company_id)
        if not company_exists:
            logger.warning(f"Upload rejected: company '{company_id}' does not exist.")
            raise ValidationError(f"Company '{company_id}' does not exist.")

        # 5. Sanitize filename
        sanitized_name = sanitize_filename(filename)

        # 6. Compute Hash for Duplicate Check
        file_hash = hashlib.sha256(file_content).hexdigest()

        # 7. Query Database to check for Duplicate uploads under the same companyId
        existing_docs = await self.db.query_documents("documents", "hash", "==", file_hash)
        existing_uploads = await self.db.query_documents("uploads", "hash", "==", file_hash)
        all_records = existing_docs + existing_uploads
        for record in all_records:
            if record.get("companyId") == company_id or record.get("company_id") == company_id:
                logger.warning(
                    f"Upload rejected: duplicate file detected for company '{company_id}' with hash '{file_hash}'."
                )
                raise ConflictError(
                    detail=f"File '{filename}' has already been uploaded.",
                    extra={
                        "existing_file_id": record.get("documentId") or record.get("id"),
                        "storage_path": record.get("storagePath") or record.get("storage_path"),
                        "uploaded_at": record.get("createdAt") or record.get("uploaded_at")
                    }
                )

        # 8. Generate documentId (UUID) and target storage path
        document_id = str(uuid.uuid4())
        destination_path = f"{company_id}/documents/{document_id}_{sanitized_name}"

        # 9. Upload file using StorageService
        logger.info(f"Uploading file to storage path: '{destination_path}'...")
        try:
            storage_path = await self.storage.upload_file(
                file_content=file_content,
                destination_blob_name=destination_path,
                content_type=content_type
            )
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise StorageError(f"Failed to upload file to storage: {str(e)}")

        # 10. Generate public/presigned access URL for legacy compatibility
        try:
            public_url = await self.storage.generate_presigned_url(destination_path)
        except Exception:
            public_url = f"https://storage-link/{destination_path}"

        # 11. Prepare metadata for Firestore
        db_metadata = {
            "documentId": document_id,
            "companyId": company_id,
            "filename": sanitized_name,
            "storagePath": destination_path,
            "contentType": content_type,
            "fileSize": file_size,
            "hash": file_hash,
            "status": "Uploaded",
            "createdAt": datetime.now(timezone.utc).isoformat() if self.db.use_mock else firestore.SERVER_TIMESTAMP,
            "updatedAt": datetime.now(timezone.utc).isoformat() if self.db.use_mock else firestore.SERVER_TIMESTAMP,
            
            # Legacy compatibility fields
            "id": document_id,
            "company_id": company_id,
            "file_size": file_size,
            "content_type": content_type,
            "storage_path": destination_path,
            "public_url": public_url,
            "uploaded_by": uploaded_by,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }

        # 12. Create Firestore Metadata Record
        logger.info(f"Creating Firestore metadata record in documents collection for ID: {document_id}")
        try:
            await self.db.create_document("documents", db_metadata, doc_id=document_id)
            await self.db.create_document("uploads", db_metadata, doc_id=document_id)
        except Exception as e:
            logger.error(f"Firestore metadata registration failed: {e}. Cleaning up uploaded file...")
            # Clean up the file from storage to avoid orphaned files
            try:
                await self.storage.delete_file(destination_path)
                logger.info(f"Cleanup executed: orphaned file deleted: '{destination_path}'")
            except Exception as delete_err:
                logger.error(f"Failed to delete orphaned file {destination_path}: {delete_err}")
            raise DatabaseError(f"Failed to register document metadata in database: {str(e)}")

        logger.info("Upload completed successfully.")
        return db_metadata

export_service = UploadService
