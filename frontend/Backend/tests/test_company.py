from fastapi.testclient import TestClient


def test_create_company_success(client: TestClient) -> None:
    """Verifies registering a company succeeds with 201."""
    payload = {
        "name": "Tesla Motors",
        "domain": "tesla.com",
        "logo_url": "https://storage.googleapis.com/logo.png"
    }
    response = client.post("/company", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["name"] == "Tesla Motors"
    assert data["data"]["domain"] == "tesla.com"
    assert "id" in data["data"]


def test_create_company_duplicate_domain(client: TestClient) -> None:
    """Verifies that duplicate domain registration fails with 409 Conflict."""
    payload = {
        "name": "Tesla Clone",
        "domain": "tesla.com"
    }
    response = client.post("/company", json=payload)
    assert response.status_code == 409
    
    data = response.json()
    assert data["error_code"] == "RESOURCE_CONFLICT"


def test_get_company_by_id_param(client: TestClient) -> None:
    """Verifies getting a company details via query parameters."""
    # First register
    reg_payload = {"name": "SpaceX", "domain": "spacex.com"}
    reg_resp = client.post("/company", json=reg_payload)
    assert reg_resp.status_code == 201
    comp_id = reg_resp.json()["data"]["id"]

    # Retrieve
    headers = {"Authorization": "Bearer mock-token-jane"}
    response = client.get(f"/company?company_id={comp_id}", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["id"] == comp_id
    assert data["data"]["name"] == "SpaceX"


def test_get_company_by_token_context(client: TestClient) -> None:
    """Verifies getting a company profile using token context claims (tenant_id)."""
    # Register company
    reg_payload = {"name": "Microsoft", "domain": "microsoft.com"}
    reg_resp = client.post("/company", json=reg_payload)
    assert reg_resp.status_code == 201
    comp_id = reg_resp.json()["data"]["id"]

    # Retrieve using a mock token that contains the tenant ID: mock-token-john__<company_id>
    headers = {"Authorization": f"Bearer mock-token-john__{comp_id}"}
    response = client.get("/company", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["id"] == comp_id
    assert data["data"]["name"] == "Microsoft"


def test_get_company_unresolvable_id(client: TestClient) -> None:
    """Verifies that getting a company without query parameter or token context returns 400 bad request error."""
    # Token mock-token-john has no double underscore, so no tenant_id is resolved
    headers = {"Authorization": "Bearer mock-token-john"}
    response = client.get("/company", headers=headers)
    assert response.status_code == 400
    assert response.headers["Content-Type"] == "application/problem+json"


def test_get_company_not_found(client: TestClient) -> None:
    """Verifies getting a nonexistent company ID returns 404."""
    headers = {"Authorization": "Bearer mock-token-john"}
    response = client.get("/company?company_id=comp-nonexistent", headers=headers)
    assert response.status_code == 404
    assert response.headers["Content-Type"] == "application/problem+json"
    
    data = response.json()
    assert data["error_code"] == "RESOURCE_NOT_FOUND"


def test_patch_company_success(client: TestClient) -> None:
    """Verifies updating company attributes successfully."""
    # Register
    reg_payload = {"name": "Apple", "domain": "apple.com"}
    reg_resp = client.post("/company", json=reg_payload)
    assert reg_resp.status_code == 201
    comp_id = reg_resp.json()["data"]["id"]

    # Update name and domain
    headers = {"Authorization": "Bearer mock-token-jobs"}
    patch_payload = {
        "name": "Apple Inc.",
        "domain": "apple.com.sg"
    }
    response = client.patch(f"/company?company_id={comp_id}", json=patch_payload, headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["name"] == "Apple Inc."
    assert data["data"]["domain"] == "apple.com.sg"


def test_patch_company_no_changes(client: TestClient) -> None:
    """Verifies patching a company with no body arguments is a valid no-op."""
    # Register
    reg_payload = {"name": "Meta", "domain": "meta.com"}
    reg_resp = client.post("/company", json=reg_payload)
    assert reg_resp.status_code == 201
    comp_id = reg_resp.json()["data"]["id"]

    headers = {"Authorization": "Bearer mock-token-zuck"}
    response = client.patch(f"/company?company_id={comp_id}", json={}, headers=headers)
    assert response.status_code == 200
    assert "No update parameters" in response.json()["message"]
