import asyncio
from typing import List, Optional
from app.config.settings import Settings
from app.services.base import IStorageService
from app.services.storage.storage_interface import StorageInterface
from app.services.storage.local_storage import LocalStorage
from app.services.storage.supabase_storage import SupabaseStorage
from app.utils.logger import get_logger

logger = get_logger("app.services.storage.service")


class StorageService(IStorageService):
    """
    StorageService orchestrates the Strategy Pattern selection and delegation.
    Implements IStorageService interface for seamless backward compatibility.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        provider_name = settings.STORAGE_PROVIDER.lower().strip()

        # Centralized factory selection
        if provider_name == "local":
            if not settings.LOCAL_STORAGE_PATH:
                raise ValueError("LOCAL_STORAGE_PATH environment variable is required when using 'local' storage provider.")
            bucket_name = settings.SUPABASE_BUCKET or "local-bucket"
            self.provider: StorageInterface = LocalStorage(settings.LOCAL_STORAGE_PATH, bucket_name=bucket_name)
        elif provider_name == "supabase":
            if not settings.SUPABASE_URL:
                raise ValueError("SUPABASE_URL environment variable is required when using 'supabase' storage provider.")

            # Fallback between SUPABASE_KEY and SUPABASE_SERVICE_ROLE_KEY
            supabase_key = settings.SUPABASE_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
            if not supabase_key:
                raise ValueError("Either SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY must be configured when using 'supabase' storage provider.")

            if not settings.SUPABASE_BUCKET:
                raise ValueError("SUPABASE_BUCKET environment variable is required when using 'supabase' storage provider.")

            self.provider: StorageInterface = SupabaseStorage(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=supabase_key,
                bucket_name=settings.SUPABASE_BUCKET
            )
        else:
            raise ValueError(f"Unknown storage provider configured: {settings.STORAGE_PROVIDER}")

        logger.info(f"StorageService initialized successfully. Active provider: {provider_name.upper()}")

    # =========================================================================
    # Strategy Pattern Specific Methods (as requested by User)
    # =========================================================================
    async def upload(self, file_content: bytes, path: str, content_type: Optional[str] = None) -> str:
        """Uploads a file using the active provider."""
        return await self.provider.upload(file_content, path, content_type)

    async def download(self, path: str) -> bytes:
        """Downloads a file using the active provider."""
        return await self.provider.download(path)

    async def delete(self, path: str) -> None:
        """Deletes a file using the active provider."""
        await self.provider.delete(path)

    async def exists(self, path: str) -> bool:
        """Checks if a file exists using the active provider."""
        return await self.provider.exists(path)

    async def list(self, prefix: Optional[str] = None) -> List[str]:
        """Lists files using the active provider."""
        return await self.provider.list_files(prefix)

    # =========================================================================
    # IStorageService Interface Methods (for Backward Compatibility)
    # =========================================================================
    async def upload_file(self, file_content: bytes, destination_blob_name: str, content_type: Optional[str] = None) -> str:
        return await self.upload(file_content, destination_blob_name, content_type)

    async def download_file(self, blob_name: str) -> bytes:
        return await self.download(blob_name)

    async def delete_file(self, blob_name: str) -> None:
        await self.delete(blob_name)

    async def list_files(self, prefix: Optional[str] = None) -> List[str]:
        return await self.provider.list_files(prefix)

    def generate_company_path(self, company_id: str, filename: str, folder: Optional[str] = None) -> str:
        return self.provider.generate_storage_path(company_id, filename, folder)

    async def generate_presigned_url(
        self, blob_name: str, expiration_seconds: int = 3600, method: str = "GET"
    ) -> str:
        return await self.provider.generate_presigned_url(blob_name, expiration_seconds, method)

    async def generate_signed_url(
        self, blob_name: str, expiration_seconds: int = 3600, method: str = "GET"
    ) -> str:
        """Alias for generate_presigned_url to comply with Phase 7 requirements."""
        return await self.generate_presigned_url(blob_name, expiration_seconds, method)

    async def validate_connectivity(self) -> None:
        """Performs a quick validation check on startup to verify connectivity."""
        if isinstance(self.provider, SupabaseStorage):
            try:
                # Check list functionality on bucket to confirm authentication/connection
                await asyncio.to_thread(
                    self.provider.client.storage.from_(self.provider.bucket_name).list,
                    options={"limit": 1}
                )
                logger.info(f"Supabase storage connectivity validated for bucket: {self.provider.bucket_name}")
            except Exception as e:
                logger.error(f"Supabase connection validation failed: {e}")
                raise RuntimeError(f"Supabase connection validation failed: {e}")
        elif isinstance(self.provider, LocalStorage):
            try:
                base_dir = self.provider.base_dir
                test_file = base_dir / ".write_test"
                test_file.touch()
                test_file.unlink()
                logger.info(f"Local storage write-permissions validated at: {base_dir}")
            except Exception as e:
                raise RuntimeError(f"Local storage write-permission validation failed at {self.provider.base_dir}: {e}")

    @property
    def use_mock(self) -> bool:
        """Backward compatibility helper for tests checking mock state."""
        if isinstance(self.provider, LocalStorage):
            return True
        supabase_key = self.settings.SUPABASE_KEY or self.settings.SUPABASE_SERVICE_ROLE_KEY
        if not supabase_key or "mock" in supabase_key.lower() or "test" in self.settings.SUPABASE_URL.lower():
            return True
        return False

    @property
    def active_provider(self) -> str:
        """Returns the identifier of the active storage strategy provider."""
        if isinstance(self.provider, LocalStorage):
            return "local"
        if isinstance(self.provider, SupabaseStorage):
            return "supabase"
        return "unknown"
