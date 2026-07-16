import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.services.base import IDatabaseService, IStorageService
from app.utils.exceptions import ValidationError, ConflictError
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
        folder: Optional[str] = "uploads"
    ) -> Dict[str, Any]:
        """
        Validates file, checks for duplicates, uploads to GCS, and logs metadata in Firestore.
        """
        # 1. Size Validation
        file_size = len(file_content)
        if file_size > MAX_FILE_SIZE:
            logger.warning(f"Upload rejected: file size {file_size} exceeds max limit of {MAX_FILE_SIZE} bytes.")
            raise ValidationError(
                f"File size exceeds the maximum limit of {MAX_FILE_SIZE / (1024 * 1024):.1f}MB."
            )

        # 2. Extension & MIME Type Validation
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"Upload rejected: extension '{ext}' is not supported.")
            raise ValidationError(
                f"Unsupported file extension '.{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}."
            )

        if content_type not in ALLOWED_MIME_TYPES:
            logger.warning(f"Upload rejected: MIME type '{content_type}' is not supported.")
            raise ValidationError(f"Unsupported MIME type '{content_type}'.")

        # 3. Compute Hash for Duplicate Check
        file_hash = hashlib.sha256(file_content).hexdigest()

        # 4. Query Database to check for Duplicate uploads under the same companyId
        existing_records = await self.db.query_documents("uploads", "hash", "==", file_hash)
        for record in existing_records:
            if record.get("company_id") == company_id:
                logger.warning(
                    f"Upload rejected: duplicate file detected for company '{company_id}' with hash '{file_hash}'."
                )
                raise ConflictError(
                    detail=f"File '{filename}' has already been uploaded.",
                    extra={
                        "existing_file_id": record.get("id"),
                        "storage_path": record.get("storage_path"),
                        "uploaded_at": record.get("uploaded_at")
                    }
                )

        # 5. Generate target destination storage path in GCS
        destination_blob = self.storage.generate_company_path(
            company_id=company_id,
            filename=filename,
            folder=folder
        )

        # 6. Upload file content to GCS
        logger.info(f"Uploading file '{filename}' to GCS at path '{destination_blob}'...")
        public_url = await self.storage.upload_file(
            file_content=file_content,
            destination_blob_name=destination_blob,
            content_type=content_type
        )

        # 7. Persist file metadata in Firestore
        metadata = {
            "company_id": company_id,
            "filename": filename,
            "file_size": file_size,
            "content_type": content_type,
            "hash": file_hash,
            "storage_path": destination_blob,
            "public_url": public_url,
            "uploaded_by": uploaded_by,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }

        logger.info(f"Registering metadata in Firestore uploads collection...")
        doc_id = await self.db.create_document("uploads", metadata)
        metadata["id"] = doc_id

        logger.info(f"File upload completed successfully. Registered ID: {doc_id}")
        return metadata
export_service = UploadService
