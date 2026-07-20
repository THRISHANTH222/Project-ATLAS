from fastapi import Depends

from app.config.settings import Settings, get_settings
from app.services.auth_service import FirebaseAuthService
from app.services.base import IAIService, IAuthService, IDatabaseService, IStorageService
from app.services.db_service import FirestoreDbService
from app.services.storage import StorageService
from app.services.ai_service import GeminiAIService

# Global instances for singleton patterns
_auth_service = None
_db_service = None
_storage_service = None
_ai_service = None


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
        _ai_service = GeminiAIService(settings)
    return _ai_service
