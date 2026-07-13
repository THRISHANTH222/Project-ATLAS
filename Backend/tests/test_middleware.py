from fastapi.testclient import TestClient


def test_correlation_id_middleware(client: TestClient) -> None:
    """Verifies that the server returns an X-Correlation-ID response header."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "X-Correlation-ID" in response.headers
    assert len(response.headers["X-Correlation-ID"]) > 0


def test_validation_error_rfc7807_format(client: TestClient) -> None:
    """Verifies that request validation errors return an RFC 7807 problem JSON details structure."""
    # Call a route with missing parameters to trigger a RequestValidationError (e.g. POST /auth/verify)
    response = client.post("/auth/verify", json={})
    assert response.status_code == 422
    assert response.headers["Content-Type"] == "application/problem+json"
    
    data = response.json()
    assert data["type"] == "about:blank"
    assert data["title"] == "Unprocessable Entity"
    assert data["status"] == 422
    assert "invalid_params" in data
    assert len(data["invalid_params"]) > 0
    assert "correlation_id" in data


def test_not_found_rfc7807_format(client: TestClient) -> None:
    """Verifies that 404 page errors return an RFC 7807 problem JSON details structure."""
    response = client.get("/non-existent-route")
    assert response.status_code == 404
    assert response.headers["Content-Type"] == "application/problem+json"
    
    data = response.json()
    assert data["status"] == 404
    assert "correlation_id" in data


def test_firebase_auth_middleware_valid_token(client: TestClient) -> None:
    """Verifies that a valid Bearer mock-token allows protected route access."""
    headers = {"Authorization": "Bearer mock-token-jane"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["uid"] == "jane"
    assert data["data"]["email"] == "jane@example.com"


def test_firebase_auth_middleware_invalid_prefix(client: TestClient) -> None:
    """Verifies that a token without Bearer prefix returns 401 RFC 7807."""
    headers = {"Authorization": "Basic credentials"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.headers["Content-Type"] == "application/problem+json"
    
    data = response.json()
    assert data["error_code"] == "AUTHENTICATION_FAILED"
    assert "Bearer" in data["detail"]


def test_firebase_auth_middleware_invalid_token(client: TestClient) -> None:
    """Verifies that an invalid mock token format returns 401 RFC 7807."""
    headers = {"Authorization": "Bearer invalidtoken"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.headers["Content-Type"] == "application/problem+json"
    
    data = response.json()
    assert data["error_code"] == "AUTHENTICATION_FAILED"
    assert "mock token" in data["detail"]


def test_firebase_auth_middleware_missing_token(client: TestClient) -> None:
    """Verifies that hitting a protected route without authorization returns 401 RFC 7807."""
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert response.headers["Content-Type"] == "application/problem+json"
    
    data = response.json()
    assert data["error_code"] == "AUTHENTICATION_FAILED"

