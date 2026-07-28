from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class IAuthService(ABC):
    """Interface for Authentication Services (e.g. Firebase Auth)."""

    @abstractmethod
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verifies a user ID token and returns decoded claims."""
        pass

    @abstractmethod
    async def get_user(self, uid: str) -> Dict[str, Any]:
        """Gets user profile details by Firebase user ID."""
        pass

    @abstractmethod
    async def create_user(self, email: str, display_name: Optional[str] = None) -> Dict[str, Any]:
        """Creates a new user profile."""
        pass

    @abstractmethod
    async def delete_user(self, uid: str) -> None:
        """Deletes a user account."""
        pass


class IDatabaseService(ABC):
    """Interface for Database Services (e.g. Firestore)."""

    @abstractmethod
    async def get_document(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a document by its ID from a collection."""
        pass

    @abstractmethod
    async def create_document(self, collection: str, data: Dict[str, Any], doc_id: Optional[str] = None) -> str:
        """Creates a document in a collection and returns the document ID."""
        pass

    @abstractmethod
    async def update_document(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        """Updates specific fields of a document."""
        pass

    @abstractmethod
    async def delete_document(self, collection: str, doc_id: str) -> None:
        """Deletes a document by ID."""
        pass

    @abstractmethod
    async def query_documents(
        self, collection: str, field_path: str, op_string: str, value: Any
    ) -> List[Dict[str, Any]]:
        """Queries documents in a collection matching conditions."""
        pass

    @abstractmethod
    async def close_connection(self) -> None:
        """Closes any active database client connections cleanly."""
        pass


class IStorageService(ABC):
    """Interface for Object Storage Services (e.g. Cloud Storage)."""

    @abstractmethod
    async def upload_file(self, file_content: bytes, destination_blob_name: str, content_type: Optional[str] = None) -> str:
        """Uploads a file to storage and returns the access URL."""
        pass

    @abstractmethod
    async def download_file(self, blob_name: str) -> bytes:
        """Downloads file content from storage."""
        pass

    @abstractmethod
    async def generate_presigned_url(
        self, blob_name: str, expiration_seconds: int = 3600, method: str = "GET"
    ) -> str:
        """Generates a presigned URL for direct secure client access."""
        pass

    @abstractmethod
    async def delete_file(self, blob_name: str) -> None:
        """Deletes a file from storage."""
        pass

    @abstractmethod
    async def list_files(self, prefix: Optional[str] = None) -> List[str]:
        """Lists all files matching a prefix in storage."""
        pass

    @abstractmethod
    def generate_company_path(self, company_id: str, filename: str, folder: Optional[str] = None) -> str:
        """Generates a structured tenant-isolated cloud storage path."""
        pass


class IAIService(ABC):
    """Interface for AI/LLM Services (e.g. Groq)."""

    @abstractmethod
    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Generates content from prompt using the LLM."""
        pass

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        response_schema: Any,
        system_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates structured JSON data conforming to a schema."""
        pass

    @abstractmethod
    async def embed_content(self, text: str) -> List[float]:
        """Generates text vector embeddings."""
        pass


class IRetrievalService(ABC):
    """Interface for Knowledge Retrieval Engine."""

    @abstractmethod
    async def retrieve_relevant_chunks(
        self,
        company_id: str,
        query: str,
        top_k: int = 5,
        document_type: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves the top K most relevant document chunks using vector similarity."""
        pass

