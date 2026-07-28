from fastapi import Depends

from app.config.settings import Settings, get_settings
from app.services.auth_service import FirebaseAuthService
from app.services.base import IAIService, IAuthService, IDatabaseService, IStorageService, IRetrievalService
from app.services.db_service import FirestoreDbService
from app.services.storage import StorageService
from app.services.ai_service import GroqAIService

# Global instances for singleton patterns
_auth_service = None
_db_service = None
_storage_service = None
_ai_service = None
_retrieval_service = None


def get_auth_service(settings: Settings = Depends(get_settings)) -> IAuthService:
    """FastAPI dependency provider for IAuthService."""
    global _auth_service
    if _auth_service is None:
        _auth_service = FirebaseAuthService(settings)
    return _auth_service


def get_db_service(settings: Settings = Depends(get_settings)) -> IDatabaseService:
    """FastAPI dependency provider for IDatabaseService."""
    global _db_service
    if _db_service is None:
        _db_service = FirestoreDbService(settings)
    return _db_service


def get_storage_service(settings: Settings = Depends(get_settings)) -> IStorageService:
    """FastAPI dependency provider for IStorageService."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService(settings)
    return _storage_service


def get_ai_service(settings: Settings = Depends(get_settings)) -> IAIService:
    """FastAPI dependency provider for IAIService."""
    global _ai_service
    if _ai_service is None:
        _ai_service = GroqAIService(settings)
    return _ai_service


def get_retrieval_service(
    settings: Settings = Depends(get_settings),
    db: IDatabaseService = Depends(get_db_service),
    ai: IAIService = Depends(get_ai_service),
) -> IRetrievalService:
    """FastAPI dependency provider for IRetrievalService."""
    global _retrieval_service
    if _retrieval_service is None:
        from app.services.retrieval_service import KnowledgeRetrievalService
        _retrieval_service = KnowledgeRetrievalService(db, ai)
    return _retrieval_service


def get_document_validator(
    ai: IAIService = Depends(get_ai_service),
) -> object:
    """FastAPI dependency provider for DocumentValidator."""
    from app.services.document_validator import DocumentValidator
    return DocumentValidator(ai)


