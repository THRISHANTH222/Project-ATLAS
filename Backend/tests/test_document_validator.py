import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

from app.services.document_validator import DocumentValidator, DocumentValidationResult
from app.services import get_document_validator


def test_document_validation_accepted_categories(client: TestClient) -> None:
    """Verifies that all accepted categories succeed with HTTP 201."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # We can test various documents matching accepted criteria (mock keyword-based rules in validator)
    accepted_filenames = [
        "company_sop.pdf",
        "hr_policy.pdf",
        "employee_handbook.docx",
        "company_policy_leave.txt",
        "product_manual.pdf",
        "technical_documentation_api.pdf",
        "finance_policy_fy26.pdf",
        "compliance_rules.pdf",
        "legal_contract.docx",
        "operations_manual.txt",
        "sales_deck.pdf",
        "internal_knowledge_base.pdf"
    ]
    
    for idx, filename in enumerate(accepted_filenames):
        # Use custom text per document to bypass checksum duplicate conflict checks
        content = f"Standard company guidelines and procedure documentation for {filename} index {idx}".encode("utf-8")
        files = {
            "file": (filename, content, "application/pdf")
        }
        response = client.post("/uploads", headers=headers, files=files)
        assert response.status_code == 201, f"Expected {filename} to yield 201 success, got {response.status_code} - {response.text}"
        
        resp_data = response.json()
        assert resp_data["status"] == "success"
        assert resp_data["data"]["filename"] == filename


def test_document_validation_rejected_categories(client: TestClient) -> None:
    """Verifies that any academic/personal/rejected category is rejected with HTTP 400."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    rejected_filenames = [
        "study_notes_algebra.pdf",
        "academic_pdf_research.pdf",
        "assignment_submission.docx",
        "textbook_chemistry.pdf",
        "science_fiction_book.txt",
        "personal_document_id.pdf"
    ]
    
    for idx, filename in enumerate(rejected_filenames):
        content = f"Rejected personal or academic training text template for {filename} index {idx}".encode("utf-8")
        files = {
            "file": (filename, content, "application/pdf")
        }
        response = client.post("/uploads", headers=headers, files=files)
        assert response.status_code == 400, f"Expected {filename} to fail with 400, got {response.status_code} - {response.text}"
        
        resp_data = response.json()
        assert resp_data["error"] == "Unsupported document"
        assert "academic" in resp_data["reason"].lower() or "personal" in resp_data["reason"].lower() or "unsupported" in resp_data["reason"].lower() or "study" in resp_data["reason"].lower()


async def mock_low_confidence_validate(self, file_content, filename, content_type):
    return DocumentValidationResult(
        accepted=True,
        category="HR Policy",
        confidence=0.81, # Below 0.85 limit!
        reason="Fuzzy policy match"
    )


def test_document_validation_low_confidence(client: TestClient, monkeypatch) -> None:
    """Verifies that class validation scoring below the 0.85 threshold is rejected with HTTP 400."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    files = {
        "file": ("valid_policy_high_unique.pdf", b"Company leaves policy manual document context details unique content", "application/pdf")
    }

    # Force the validator to return a low confidence rating
    monkeypatch.setattr(DocumentValidator, "validate_document", mock_low_confidence_validate)

    response = client.post("/uploads", headers=headers, files=files)
    assert response.status_code == 400
    
    resp_data = response.json()
    assert resp_data["error"] == "Unsupported document"
