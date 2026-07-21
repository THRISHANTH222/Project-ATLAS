from typing import Generator
import pytest
from fastapi.testclient import TestClient

from app.config.settings import Settings, get_settings
from app.main import app


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Fixture returning settings configured for testing."""
    return Settings(
        ENVIRONMENT="testing",
        FIREBASE_PROJECT_ID="test-project",
        FIREBASE_CREDENTIALS_PATH="",
        GCS_BUCKET_NAME="test-bucket",
        GEMINI_API_KEY="mock-gemini-api-key",
        GEMINI_MODEL_NAME="gemini-1.5-flash",
    )


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    """Fixture providing a FastAPI TestClient configured for request testing."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers() -> dict:
    """Fixture providing mock authorization headers to test protected routes."""
    return {"Authorization": "Bearer mock-token-test-uid-123"}
