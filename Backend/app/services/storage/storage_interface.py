from abc import ABC, abstractmethod
from typing import List, Optional
from app.utils.exceptions import StorageError


class StorageFileNotFoundError(StorageError):
    def __init__(self, detail: str = "File not found in storage", extra = None):
        super().__init__(detail=detail, extra=extra)
        self.status_code = 404
        self.title = "Storage File Not Found"
        self.error_code = "STORAGE_FILE_NOT_FOUND"


class StorageSecurityError(StorageError):
    def __init__(self, detail: str = "Storage security violation", extra = None):
        super().__init__(detail=detail, extra=extra)
        self.status_code = 400
        self.title = "Storage Security Exception"
        self.error_code = "STORAGE_SECURITY_VIOLATION"


class StorageInterface(ABC):
    """
    Abstract Interface defining the Strategy Pattern storage contract.
    Decouples routes and service layer from local, Supabase, or other cloud storage implementations.
    """

    @abstractmethod
    async def upload(self, file_content: bytes, path: str, content_type: Optional[str] = None) -> str:
        """
        Uploads a file to storage and returns the access URL.
        """
        pass

    @abstractmethod
    async def download(self, path: str) -> bytes:
        """
        Downloads a file content from storage.
        """
        pass

    @abstractmethod
    async def delete(self, path: str) -> None:
        """
        Deletes a file from storage.
        """
        pass

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """
        Checks if a file exists in storage.
        """
        pass

    @abstractmethod
    async def list_files(self, prefix: Optional[str] = None) -> List[str]:
        """
        Lists all files matching a prefix in storage.
        """
        pass

    @abstractmethod
    def generate_storage_path(self, company_id: str, filename: str, folder: Optional[str] = None) -> str:
        """
        Generates a structured tenant-isolated path.
        """
        pass

    @abstractmethod
    async def generate_presigned_url(
        self, path: str, expiration_seconds: int = 3600, method: str = "GET"
    ) -> str:
        """
        Generates a signed URL for direct secure access.
        """
        pass
