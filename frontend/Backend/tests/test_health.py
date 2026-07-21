from fastapi.testclient import TestClient


def test_health_check_endpoint(client: TestClient) -> None:
    """Verifies that the /health endpoint is public and returns valid structure."""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "environment" in data
    assert "services" in data
    
    # Assert database, storage and AI services are listed
    services = data["services"]
    assert "database" in services
    assert "storage" in services
    assert "ai_service" in services
    
    # In mock/test settings, services should report healthy
    assert services["database"]["status"] == "healthy"
    assert services["storage"]["status"] == "healthy"
    assert services["ai_service"]["status"] == "healthy"
