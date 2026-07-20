import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.utils.exceptions import DatabaseError

def test_delete_success(client: TestClient) -> None:
    """Verifies that an authorized user can delete their company's document."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # 1. Upload a document
    files = {
        "file": ("delete_test.pdf", b"Bytes for deletion test", "application/pdf")
    }
    upload_res = client.post("/uploads", headers=headers, files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["data"]["documentId"]
    
    # 2. Delete the document
    delete_res = client.delete(f"/documents/{doc_id}", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True
    assert delete_res.json()["message"] == "Document deleted successfully."
    
    # 3. Verify it is gone (should return 404 on download/get)
    get_res = client.get(f"/documents/{doc_id}", headers=headers)
    assert get_res.status_code == 404


def test_delete_forbidden_cross_company(client: TestClient) -> None:
    """Verifies that a user from company XYZ is forbidden from deleting a document owned by company ABC."""
    headers_abc = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    headers_xyz = {"Authorization": "Bearer mock-token-user999__comp-xyz"}
    
    # 1. Upload document as company ABC
    files = {
        "file": ("delete_secret.pdf", b"Highly confidential company ABC information - delete", "application/pdf")
    }
    upload_res = client.post("/uploads", headers=headers_abc, files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["data"]["documentId"]
    
    # 2. Try to delete as company XYZ (should be 403 Forbidden)
    delete_res = client.delete(f"/documents/{doc_id}", headers=headers_xyz)
    assert delete_res.status_code == 403
    assert delete_res.json()["error_code"] == "PERMISSION_DENIED"


def test_delete_not_found(client: TestClient) -> None:
    """Verifies that deleting a non-existent document ID returns a 404 Not Found."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    delete_res = client.delete("/documents/non-existent-uuid-12345", headers=headers)
    assert delete_res.status_code == 404
    assert delete_res.json()["error_code"] == "RESOURCE_NOT_FOUND"


def test_delete_unauthorized_guest(client: TestClient) -> None:
    """Verifies that a guest request with no token fails with 401 Unauthorized."""
    delete_res = client.delete("/documents/some-doc-id")
    assert delete_res.status_code == 401
    assert delete_res.json()["error_code"] == "AUTHENTICATION_FAILED"


def test_delete_inconsistency_error(client: TestClient) -> None:
    """Verifies that if Firestore deletion fails after storage deletion, an inconsistency error is raised."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # 1. Upload document
    files = {
        "file": ("delete_inconsistent.pdf", b"Inconsistency check bytes", "application/pdf")
    }
    upload_res = client.post("/uploads", headers=headers, files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["data"]["documentId"]
    
    # 2. Mock Firestore delete_document to raise an error
    with patch("app.services.db_service.FirestoreDbService.delete_document", side_effect=Exception("Firestore failure")):
        delete_res = client.delete(f"/documents/{doc_id}", headers=headers)
        assert delete_res.status_code == 500
        resp = delete_res.json()
        assert resp["error_code"] == "DATA_INCONSISTENCY"
        assert "System is in an inconsistent state" in resp["detail"]
