import pytest
from fastapi.testclient import TestClient

def test_download_success(client: TestClient) -> None:
    """Verifies that an authorized user can get a signed download URL for their company's document."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # 1. Upload a document first
    files = {
        "file": ("test_doc.pdf", b"Unique bytes for successful download test", "application/pdf")
    }
    upload_res = client.post("/uploads", headers=headers, files=files)
    assert upload_res.status_code == 201
    
    upload_data = upload_res.json()["data"]
    doc_id = upload_data["documentId"]
    filename = upload_data["filename"]
    
    # 2. Query download URL
    download_res = client.get(f"/documents/{doc_id}", headers=headers)
    assert download_res.status_code == 200
    
    download_data = download_res.json()
    assert download_data["success"] is True
    assert download_data["message"] == "Signed download URL generated successfully."
    
    data = download_data["data"]
    assert data["documentId"] == doc_id
    assert data["filename"] == filename
    assert "downloadUrl" in data
    assert data["expiresIn"] == 600


def test_download_forbidden_cross_company(client: TestClient) -> None:
    """Verifies that a user from company XYZ is forbidden from downloading a document owned by company ABC."""
    headers_abc = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    headers_xyz = {"Authorization": "Bearer mock-token-user999__comp-xyz"}
    
    # 1. Upload document as company ABC
    files = {
        "file": ("secret_doc.pdf", b"Highly confidential company ABC information - unique", "application/pdf")
    }
    upload_res = client.post("/uploads", headers=headers_abc, files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["data"]["documentId"]
    
    # 2. Try to download as company XYZ (should be 403 Forbidden)
    download_res = client.get(f"/documents/{doc_id}", headers=headers_xyz)
    assert download_res.status_code == 403
    
    resp = download_res.json()
    assert resp["error_code"] == "PERMISSION_DENIED"
    assert "do not have permission" in resp["detail"]


def test_download_not_found(client: TestClient) -> None:
    """Verifies that querying a non-existent document ID returns a 404 Not Found."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    download_res = client.get("/documents/non-existent-uuid-12345", headers=headers)
    assert download_res.status_code == 404
    
    resp = download_res.json()
    assert resp["error_code"] == "RESOURCE_NOT_FOUND"


def test_download_unauthorized_guest(client: TestClient) -> None:
    """Verifies that a guest request with no token fails with 401 Unauthorized."""
    download_res = client.get("/documents/some-doc-id")
    assert download_res.status_code == 401
    
    resp = download_res.json()
    assert resp["error_code"] == "AUTHENTICATION_FAILED"


def test_download_missing_user_company_association(client: TestClient) -> None:
    """Verifies that a user with no company/tenant association is forbidden from accessing documents."""
    headers_abc = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    headers_no_comp = {"Authorization": "Bearer mock-token-independent-user"}
    
    # 1. Upload document as company ABC
    files = {
        "file": ("test_doc_missing.pdf", b"Unique bytes for missing user company association test", "application/pdf")
    }
    upload_res = client.post("/uploads", headers=headers_abc, files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["data"]["documentId"]

    # 2. Query download with user having no tenant association
    download_res = client.get(f"/documents/{doc_id}", headers=headers_no_comp)
    assert download_res.status_code == 403
    
    resp = download_res.json()
    assert "not associated with any tenant company" in resp["detail"]
