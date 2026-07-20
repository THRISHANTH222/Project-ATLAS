import os
import shutil
import asyncio
from pathlib import Path
from typing import List, Optional
from app.services.storage.storage_interface import StorageInterface, StorageFileNotFoundError, StorageSecurityError
from app.utils.logger import get_logger

logger = get_logger("app.services.storage.local")


class LocalStorage(StorageInterface):
    """
    LocalStorage implementation storing files directly in the filesystem.
    """

    def __init__(self, base_dir: str, bucket_name: str = "local-bucket"):
        self.bucket_name = bucket_name
        self.base_dir = (Path(base_dir).resolve() / bucket_name)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Local Storage Provider initialized at: {self.base_dir}")

    def _safe_resolve(self, relative_path: str) -> Path:
        """
        Safely resolves a relative path against base_dir.
        Raises StorageSecurityError if path traversal is detected.
        """
        clean_path = Path(relative_path.lstrip("/").lstrip("\\"))
        resolved = (self.base_dir / clean_path).resolve()
        try:
            resolved.relative_to(self.base_dir)
        except ValueError:
            logger.warning(f"Path traversal attempt blocked: {relative_path}")
            raise StorageSecurityError(f"Directory traversal attempt detected: {relative_path}")
        return resolved

    async def upload(self, file_content: bytes, path: str, content_type: Optional[str] = None) -> str:
        return await asyncio.to_thread(self._upload_sync, file_content, path)

    def _upload_sync(self, file_content: bytes, path: str) -> str:
        target_path = self._safe_resolve(path)
        # Create parent directories if they don't exist
        target_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Uploading file locally to: {target_path}")
        target_path.write_bytes(file_content)
        # Return the absolute path as string
        return str(target_path)

    async def download(self, path: str) -> bytes:
        return await asyncio.to_thread(self._download_sync, path)

    def _download_sync(self, path: str) -> bytes:
        target_path = self._safe_resolve(path)
        if not target_path.exists() or not target_path.is_file():
            logger.error(f"Local file not found for download: {target_path}")
            raise StorageFileNotFoundError(f"File {path} not found in local storage.")
        logger.info(f"Downloading file locally from: {target_path}")
        return target_path.read_bytes()

    async def delete(self, path: str) -> None:
        await asyncio.to_thread(self._delete_sync, path)

    def _delete_sync(self, path: str) -> None:
        target_path = self._safe_resolve(path)
        if not target_path.exists() or not target_path.is_file():
            logger.error(f"Local file not found for deletion: {target_path}")
            raise StorageFileNotFoundError(f"File {path} not found in local storage.")
        logger.info(f"Deleting local file: {target_path}")
        target_path.unlink()

    async def exists(self, path: str) -> bool:
        return await asyncio.to_thread(self._exists_sync, path)

    def _exists_sync(self, path: str) -> bool:
        try:
            target_path = self._safe_resolve(path)
            return target_path.exists() and target_path.is_file()
        except StorageSecurityError:
            return False

    async def list_files(self, prefix: Optional[str] = None) -> List[str]:
        return await asyncio.to_thread(self._list_files_sync, prefix)

    def _list_files_sync(self, prefix: Optional[str] = None) -> List[str]:
        if prefix:
            target_dir = self._safe_resolve(prefix)
            if not target_dir.exists() or not target_dir.is_dir():
                parent_dir = target_dir.parent
                if not parent_dir.exists() or not parent_dir.is_dir():
                    return []
                prefix_str = str(target_dir)
                files = []
                for p in parent_dir.rglob("*"):
                    if p.is_file() and str(p).startswith(prefix_str):
                        rel_path = p.relative_to(self.base_dir)
                        files.append(str(rel_path).replace("\\", "/"))
                return files
        else:
            target_dir = self.base_dir

        if not target_dir.exists() or not target_dir.is_dir():
            return []

        files = []
        for p in target_dir.rglob("*"):
            if p.is_file():
                rel_path = p.relative_to(self.base_dir)
                files.append(str(rel_path).replace("\\", "/"))
        return files

    def generate_storage_path(self, company_id: str, filename: str, folder: Optional[str] = None) -> str:
        clean_company = company_id.strip().lower()
        clean_filename = filename.strip()
        if folder:
            clean_folder = folder.strip().strip("/")
            return f"tenants/{clean_company}/{clean_folder}/{clean_filename}"
        return f"tenants/{clean_company}/{clean_filename}"

    async def generate_presigned_url(
        self, path: str, expiration_seconds: int = 3600, method: str = "GET"
    ) -> str:
        return f"http://localhost:8000/storage/local-file/{path}?expires={expiration_seconds}&method={method}"
