from datetime import datetime, timedelta, timezone
from typing import List, Optional
from google.cloud import storage

from app.config.settings import Settings
from app.services.base import IStorageService
from app.utils.exceptions import StorageError
from app.utils.logger import get_logger

logger = get_logger("app.services.storage")


class GcsStorageService(IStorageService):
    """
    Google Cloud Storage concrete implementation.
    Includes fallback mock memory storage for local development and unit testing.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.bucket_name = settings.GCS_BUCKET_NAME
        self.use_mock = settings.ENVIRONMENT.lower() == "development" and not settings.FIREBASE_CREDENTIALS_PATH
        self.client = None

        if not self.use_mock:
            try:
                self.client = storage.Client()
                logger.info(f"Google Cloud Storage client initialized for bucket: {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to initialize GCS Client: {e}. Switching to mock storage.")
                self.use_mock = True
                self.mock_storage = {}
        else:
            logger.info("GCS Storage service started in MOCK mode for development.")
            self.mock_storage = {}

    async def upload_file(self, file_content: bytes, destination_blob_name: str, content_type: Optional[str] = None) -> str:
        if self.use_mock:
            self.mock_storage[destination_blob_name] = {
                "content": file_content,
                "content_type": content_type or "application/octet-stream",
            }
            logger.debug(f"Mock Upload: {destination_blob_name} uploaded successfully.")
            return f"https://storage.googleapis.com/{self.bucket_name}/{destination_blob_name}"

        try:
            bucket = self.client.bucket(self.bucket_name) # type: ignore
            blob = bucket.blob(destination_blob_name)
            blob.upload_from_string(file_content, content_type=content_type)
            return blob.public_url
        except Exception as e:
            raise StorageError(f"Failed to upload file to storage: {str(e)}")

    async def download_file(self, blob_name: str) -> bytes:
        if self.use_mock:
            if blob_name not in self.mock_storage:
                raise StorageError(f"File {blob_name} not found in mock storage.")
            return self.mock_storage[blob_name]["content"]

        try:
            bucket = self.client.bucket(self.bucket_name) # type: ignore
            blob = bucket.blob(blob_name)
            if not blob.exists():
                raise StorageError(f"File {blob_name} not found in storage.")
            return blob.download_as_bytes()
        except StorageError:
            raise
        except Exception as e:
            raise StorageError(f"Failed to download file from storage: {str(e)}")

    async def generate_presigned_url(
        self, blob_name: str, expiration_seconds: int = 3600, method: str = "GET"
    ) -> str:
        if self.use_mock:
            return f"https://storage.googleapis.com/{self.bucket_name}/{blob_name}?mock-signature=true&expires={expiration_seconds}&method={method}"

        try:
            bucket = self.client.bucket(self.bucket_name) # type: ignore
            blob = bucket.blob(blob_name)
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expiration_seconds),
                method=method,
            )
            return url
        except Exception as e:
            raise StorageError(f"Failed to generate signed URL: {str(e)}")

    async def delete_file(self, blob_name: str) -> None:
        if self.use_mock:
            if blob_name in self.mock_storage:
                del self.mock_storage[blob_name]
            return

        try:
            bucket = self.client.bucket(self.bucket_name) # type: ignore
            blob = bucket.blob(blob_name)
            if not blob.exists():
                raise StorageError(f"File {blob_name} not found in storage.")
            blob.delete()
        except StorageError:
            raise
        except Exception as e:
            raise StorageError(f"Failed to delete file from storage: {str(e)}")

    async def list_files(self, prefix: Optional[str] = None) -> List[str]:
        if self.use_mock:
            if prefix:
                return [k for k in self.mock_storage.keys() if k.startswith(prefix)]
            return list(self.mock_storage.keys())

        try:
            blobs = self.client.list_blobs(self.bucket_name, prefix=prefix) # type: ignore
            return [blob.name for blob in blobs]
        except Exception as e:
            raise StorageError(f"Failed to list files from bucket {self.bucket_name}: {str(e)}")

    def generate_company_path(self, company_id: str, filename: str, folder: Optional[str] = None) -> str:
        clean_company = company_id.strip().lower()
        clean_filename = filename.strip()
        if folder:
            clean_folder = folder.strip().strip("/")
            return f"tenants/{clean_company}/{clean_folder}/{clean_filename}"
        return f"tenants/{clean_company}/{clean_filename}"
