import asyncio
from typing import List, Optional
from supabase import create_client, Client
from app.services.storage.storage_interface import StorageInterface, StorageFileNotFoundError, StorageError
from app.utils.logger import get_logger

logger = get_logger("app.services.storage.supabase")


class SupabaseStorage(StorageInterface):
    """
    SupabaseStorage strategy using the official Supabase Python client.
    """

    def __init__(self, supabase_url: str, supabase_key: str, bucket_name: str):
        if not supabase_url or not supabase_key or not bucket_name:
            raise ValueError("Supabase URL, Key, and Bucket must be configured.")
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self.bucket_name = bucket_name
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info(f"Supabase Storage Provider initialized for bucket: {self.bucket_name}")

    async def upload(self, file_content: bytes, path: str, content_type: Optional[str] = None) -> str:
        try:
            options = {"upsert": "true"}
            if content_type:
                options["content-type"] = content_type

            logger.info(f"Uploading file to Supabase Storage at: {path}")
            await asyncio.to_thread(
                self.client.storage.from_(self.bucket_name).upload,
                path=path,
                file=file_content,
                file_options=options
            )
            return f"{self.supabase_url}/storage/v1/object/authenticated/{self.bucket_name}/{path}"
        except Exception as e:
            logger.error(f"Supabase upload failed for path {path}: {e}")
            raise StorageError(f"Failed to upload file to Supabase: {str(e)}")

    async def download(self, path: str) -> bytes:
        try:
            logger.info(f"Downloading file from Supabase Storage: {path}")
            content = await asyncio.to_thread(
                self.client.storage.from_(self.bucket_name).download,
                path=path
            )
            return content
        except Exception as e:
            err_msg = str(e).lower()
            if "404" in err_msg or "not found" in err_msg or "does not exist" in err_msg:
                logger.error(f"Supabase file not found for download: {path}")
                raise StorageFileNotFoundError(f"File {path} not found in Supabase Storage.")
            logger.error(f"Supabase download failed for path {path}: {e}")
            raise StorageError(f"Failed to download file from Supabase: {str(e)}")

    async def delete(self, path: str) -> None:
        try:
            logger.info(f"Deleting file from Supabase Storage: {path}")
            exists = await self.exists(path)
            if not exists:
                logger.error(f"Supabase file not found for deletion: {path}")
                raise StorageFileNotFoundError(f"File {path} not found in Supabase Storage.")

            await asyncio.to_thread(
                self.client.storage.from_(self.bucket_name).remove,
                paths=[path]
            )
        except StorageFileNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Supabase delete failed for path {path}: {e}")
            raise StorageError(f"Failed to delete file from Supabase: {str(e)}")

    async def exists(self, path: str) -> bool:
        try:
            parts = path.rsplit("/", 1)
            folder = parts[0] if len(parts) > 1 else ""
            filename = parts[1] if len(parts) > 1 else path

            res = await asyncio.to_thread(
                self.client.storage.from_(self.bucket_name).list,
                path=folder
            )
            return any(item.get("name") == filename for item in res)
        except Exception:
            return False

    async def list_files(self, prefix: Optional[str] = None) -> List[str]:
        try:
            folder = prefix or ""
            res = await asyncio.to_thread(
                self.client.storage.from_(self.bucket_name).list,
                path=folder
            )

            files = []
            for item in res:
                name = item.get("name")
                if name and item.get("id") is not None:
                    full_name = f"{folder.rstrip('/')}/{name}" if folder else name
                    files.append(full_name)
            return files
        except Exception as e:
            logger.error(f"Supabase list failed for prefix {prefix}: {e}")
            raise StorageError(f"Failed to list files from Supabase: {str(e)}")

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
        try:
            if method.upper() == "GET":
                res = await asyncio.to_thread(
                    self.client.storage.from_(self.bucket_name).create_signed_url,
                    path=path,
                    expires_in=expiration_seconds
                )
                if isinstance(res, dict):
                    url_val = res.get("signedURL") or res.get("signed_url") or res.get("url")
                else:
                    url_val = getattr(res, "signed_url", None) or getattr(res, "url", None) or res
                return url_val
            else:
                import httpx
                url = f"{self.supabase_url}/storage/v1/object/upload/sign/{self.bucket_name}/{path}"
                headers = {
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/json"
                }
                payload = {"expiresIn": expiration_seconds}
                async with httpx.AsyncClient() as http_client:
                    response = await http_client.post(url, headers=headers, json=payload, timeout=30.0)
                    if response.status_code != 200:
                        raise StorageError(f"Failed to generate signed upload URL: {response.status_code} - {response.text}")
                    data = response.json()
                    url_val = data.get("signedURL") or data.get("url") or data.get("signedUrl")
                    if url_val and url_val.startswith("/"):
                        url_val = f"{self.supabase_url}{url_val}"
                    return url_val
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for path {path}: {e}")
            raise StorageError(f"Failed to generate presigned URL: {str(e)}")
