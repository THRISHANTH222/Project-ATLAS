import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from typing import Optional
from app.prompts.templates import PromptBuilder

# =========================================================================
# Mock Models for Testing
# =========================================================================

class MockCompanyModel(BaseModel):
    name: str = Field(..., alias="companyName")
    domain: str = Field(...)
    country: Optional[str] = None


# =========================================================================
# Unit Tests for PromptBuilder.build_retrieval_prompt
# =========================================================================

def test_prompt_builder_default_system_prompt() -> None:
    # Build prompt without custom system instructions
    prompt = PromptBuilder.build_retrieval_prompt(
        chunks=[],
        question="How is revenue calculated?",
        company_knowledge="Acme Corp Profile Details"
    )

    # Check sections are present
    assert "SYSTEM INSTRUCTIONS:" in prompt
    assert "COMPANY KNOWLEDGE:" in prompt
    assert "RETRIEVED CHUNKS:" in prompt
    assert "USER QUESTION:" in prompt

    # Verify default rule guidelines are injected
    assert "Never hallucinate" in prompt
    assert "Cite the source chunk IDs" in prompt
    assert "Acme Corp Profile Details" in prompt
    assert "How is revenue calculated?" in prompt


def test_prompt_builder_company_knowledge_formats() -> None:
    # 1. Test Dict formatting
    dict_knowledge = {
        "name": "Beta LLC",
        "domain": "beta.com",
        "is_active": True
    }
    prompt_dict = PromptBuilder.build_retrieval_prompt(
        chunks=[],
        question="test?",
        company_knowledge=dict_knowledge
    )
    assert "Name: Beta LLC" in prompt_dict
    assert "Domain: beta.com" in prompt_dict
    assert "Is Active: True" in prompt_dict

    # 2. Test Pydantic Model formatting
    pydantic_knowledge = MockCompanyModel(companyName="Gamma Inc", domain="gamma.co")
    prompt_pydantic = PromptBuilder.build_retrieval_prompt(
        chunks=[],
        question="test?",
        company_knowledge=pydantic_knowledge
    )
    assert "Name: Gamma Inc" in prompt_pydantic
    assert "Domain: gamma.co" in prompt_pydantic


def test_prompt_builder_chunks_formatting() -> None:
    chunks = [
        {
            "chunkId": "c-10",
            "documentId": "doc-50",
            "pageNumber": 4,
            "chunkText": "Revenue grows at 15%."
        },
        {
            "chunkId": "c-11",
            "documentId": "doc-50",
            "pageNumber": None,
            "chunkText": "Operating margin is 22%."
        }
    ]

    prompt = PromptBuilder.build_retrieval_prompt(
        chunks=chunks,
        question="test?",
        company_knowledge=""
    )

    # Verify chunk structures are printed
    assert "--- Chunk ID: [c-10] (Doc: doc-50) (Page 4) ---" in prompt
    assert "Revenue grows at 15%." in prompt
    assert "--- Chunk ID: [c-11] (Doc: doc-50) ---" in prompt
    assert "Operating margin is 22%." in prompt
    assert "(Page None)" not in prompt


# =========================================================================
# Integration Route Tests for POST /ai/prompt-qa
# =========================================================================

def test_ai_prompt_qa_endpoint_success(client: TestClient) -> None:
    """Verifies retrieval Q&A endpoint formats and processes request successfully."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # Pre-populate database mocks
    import app.services as services_module
    from app.config.settings import get_settings
    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()
    
    # Mock company details and chunk vectors in Firestore mock state
    db.mock_db["companies"] = {
        "comp-abc": {
            "id": "comp-abc",
            "name": "Alpha Delta Corp",
            "domain": "alphadelta.io"
        }
    }
    
    db.mock_db["embeddings"] = {
        "emb-qa-1": {
            "companyId": "comp-abc",
            "documentId": "doc-1",
            "chunkId": "chunk-1",
            "embeddingVector": [0.1] * 768,
            "content": "Alpha Delta financial returns exceeded forecasts.",
            "pageNumber": 2
        }
    }

    payload = {
        "query": "financial returns",
        "top_k": 2
    }

    response = client.post("/ai/prompt-qa", headers=headers, json=payload)
    assert response.status_code == 200

    resp = response.json()
    assert resp["status"] == "success"
    assert resp["success"] is True
    
    # Gemini mock returns a success text string
    assert "Mock response" in resp["data"]
    assert "financial returns" in resp["data"]


def test_ai_prompt_qa_endpoint_unauthorized(client: TestClient) -> None:
    """Verifies that missing auth credentials returns 401 Unauthorized."""
    payload = {"query": "test query"}
    response = client.post("/ai/prompt-qa", json=payload)
    assert response.status_code == 401


def test_ai_prompt_qa_endpoint_invalid_payload(client: TestClient) -> None:
    """Verifies invalid query payloads are rejected with 422 Unprocessable Entity."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    payload = {"query": ""} # empty query is invalid
    response = client.post("/ai/prompt-qa", headers=headers, json=payload)
    assert response.status_code == 422
