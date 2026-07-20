import pytest
from typing import Generator
from fastapi.testclient import TestClient

from app.config.settings import Settings
import app.config.settings as settings_module

# 1. Override the global settings provider with mock settings for testing.
# This must be done BEFORE importing app.main to prevent the app from loading
# production credentials and connecting to real external services during tests.
test_settings_obj = Settings(
    ENVIRONMENT="testing",
    FIREBASE_PROJECT_ID="test-project",
    FIREBASE_CREDENTIALS_PATH="",
    STORAGE_PROVIDER="local",
    LOCAL_STORAGE_PATH="uploads/",
    GCS_BUCKET_NAME="test-bucket",
    SUPABASE_URL="https://test-project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY="mock-service-role-key",
    SUPABASE_BUCKET="test-bucket",
    GEMINI_API_KEY="mock-gemini-api-key",
    GEMINI_MODEL_NAME="gemini-1.5-flash",
)
settings_module.get_settings = lambda: test_settings_obj

from app.main import app

@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Fixture returning settings configured for testing."""
    return test_settings_obj


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    """Fixture providing a FastAPI TestClient configured for request testing."""
    # Reset any cached services to force them to reinitialize using the test settings
    import app.services as services_module
    services_module._auth_service = None
    services_module._db_service = None
    services_module._storage_service = None
    services_module._ai_service = None
    
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers() -> dict:
    """Fixture providing mock authorization headers to test protected routes."""
    return {"Authorization": "Bearer mock-token-test-uid-123"}
