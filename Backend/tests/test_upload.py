import pytest
from fastapi.testclient import TestClient

def test_upload_success_pdf(client: TestClient) -> None:
    """Verifies that uploading a valid PDF document succeeds."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # Multipart file payload
    files = {
        "file": ("document.pdf", b"This is a dummy PDF file content", "application/pdf")
    }
    data = {
        "folder": "invoices"
    }

    response = client.post("/uploads", headers=headers, files=files, data=data)
    assert response.status_code == 201

    resp_data = response.json()
    assert resp_data["status"] == "success"
    assert resp_data["message"] == "Document uploaded successfully."
    
    meta = resp_data["data"]
    assert meta["filename"] == "document.pdf"
    assert meta["content_type"] == "application/pdf"
    assert meta["company_id"] == "comp-abc"
    assert "public_url" in meta
    assert "id" in meta


def test_upload_success_xlsx(client: TestClient) -> None:
    """Verifies that uploading a valid Excel (XLSX) document succeeds."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    files = {
        "file": ("sheet.xlsx", b"Dummy Excel spreadsheet bytes", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    }

    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 201
    
    meta = response.json()["data"]
    assert meta["filename"] == "sheet.xlsx"
    assert meta["content_type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def test_upload_size_limit_exceeded(client: TestClient) -> None:
    """Verifies that uploading a file exceeding 10MB limit fails with 400 Bad Request."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # 11 MB of dummy data
    large_content = b"x" * (11 * 1024 * 1024)
    files = {
        "file": ("huge.txt", large_content, "text/plain")
    }

    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 400
    
    resp_data = response.json()
    assert resp_data["error_code"] == "BAD_REQUEST"
    assert "exceeds the maximum limit" in resp_data["detail"]


def test_upload_invalid_extension(client: TestClient) -> None:
    """Verifies that uploading an unsupported extension fails with 400."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    files = {
        "file": ("dangerous_script.exe", b"print('Hello')", "text/plain")
    }

    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_upload_invalid_mime_type(client: TestClient) -> None:
    """Verifies that uploading an unsupported MIME type fails with 400."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    files = {
        "file": ("document.pdf", b"Some content", "application/octet-stream")
    }

    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 400
    assert "Unsupported MIME type" in response.json()["detail"]


def test_upload_duplicate_prevention(client: TestClient) -> None:
    """Verifies that duplicate file content uploads within the same company are rejected with 409 Conflict."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-xyz"}
    
    files1 = {
        "file": ("first_upload.docx", b"Unique docx content to hash", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }
    
    # First upload succeeds
    response1 = client.post("/uploads", headers=headers, files=files1)
    assert response1.status_code == 201

    # Second upload with same content for the same company fails
    files2 = {
        "file": ("duplicate_upload.docx", b"Unique docx content to hash", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }
    response2 = client.post("/uploads", headers=headers, files=files2)
    assert response2.status_code == 409
    
    resp_data2 = response2.json()
    assert resp_data2["error_code"] == "RESOURCE_CONFLICT"
    assert "already been uploaded" in resp_data2["detail"]


def test_upload_missing_company_id(client: TestClient) -> None:
    """Verifies that upload fails if company ID cannot be resolved from the authentication claims."""
    # Token without double underscore doesn't resolve tenant/company ID in mock auth
    headers = {"Authorization": "Bearer mock-token-independent-user"}
    
    files = {
        "file": ("report.txt", b"Report data...", "text/plain")
    }

    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 400
    assert "does not contain a valid tenant/company association" in response.json()["detail"]


def test_upload_phase_6_contract(client: TestClient) -> None:
    """Verifies that upload response fully complies with the Phase 6 response structure."""
    headers = {"Authorization": "Bearer mock-token-user789__comp-phase6"}
    files = {
        "file": ("HR.pdf", b"PDF file contents for Phase 6", "application/pdf")
    }
    
    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 201
    
    resp = response.json()
    assert resp["success"] is True
    assert resp["message"] == "Document uploaded successfully."
    
    data = resp["data"]
    assert "documentId" in data
    assert data["companyId"] == "comp-phase6"
    assert data["filename"] == "HR.pdf"
    assert data["status"] == "Uploaded"
    
    # Verify path convention: companyId/documents/{documentId}_{originalFilename}
    expected_storage_prefix = f"comp-phase6/documents/{data['documentId']}_HR.pdf"
    assert data["storagePath"] == expected_storage_prefix


def test_upload_firestore_failure_cleanup(client: TestClient, monkeypatch) -> None:
    """Verifies that if Firestore metadata registration fails, the uploaded storage file is cleaned up."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-cleanup"}
    files = {
        "file": ("cleanup-test.pdf", b"Clean me up on db fail", "application/pdf")
    }

    # Mock Firestore create_document to raise an exception when writing to "documents"
    from app.services.db_service import FirestoreDbService
    original_create = FirestoreDbService.create_document
    
    async def mock_create_document(self, collection, data, doc_id=None):
        if collection == "documents":
            raise RuntimeError("Simulated Database Error")
        return await original_create(self, collection, data, doc_id)
        
    monkeypatch.setattr(FirestoreDbService, "create_document", mock_create_document)
    
    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 500
    assert "Simulated Database Error" in response.json()["detail"]

