import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

def test_health_storage_success(client: TestClient) -> None:
    """Verifies that GET /health/storage returns healthy status when connection check succeeds."""
    response = client.get("/health/storage")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "provider" in data
    assert "bucket" in data


def test_health_storage_degraded(client: TestClient) -> None:
    """Verifies that GET /health/storage returns 503 Service Unavailable when connection check raises an exception."""
    with patch("app.services.storage.storage_service.StorageService.validate_connectivity", side_effect=RuntimeError("Connection lost")):
        response = client.get("/health/storage")
        assert response.status_code == 503
        
        data = response.json()
        assert "Storage health check failed" in data["detail"]
