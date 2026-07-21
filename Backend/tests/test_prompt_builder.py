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


def test_prompt_builder_structured_components() -> None:
    """Verifies PromptBuilder.build_structured_prompt generates correct System Prompt, Context, and Question components."""
    chunks = [
        {
            "chunkId": "chunk-100",
            "documentId": "doc-50",
            "documentName": "Agreement.pdf",
            "page": 2,
            "text": "Termination requires 30 days notice."
        }
    ]
    
    result = PromptBuilder.build_structured_prompt(
        chunks=chunks,
        question="What is the notice period?",
        company_knowledge="Acme Enterprise Profile"
    )
    
    assert "system_prompt" in result
    assert "context" in result
    assert "question" in result
    
    # Verify System Prompt rules
    assert "Never hallucinate" in result["system_prompt"]
    assert "Never answer outside the provided context" in result["system_prompt"]
    assert "Cite and return the source chunk IDs" in result["system_prompt"]
    
    # Verify Context details
    assert "COMPANY KNOWLEDGE:\nAcme Enterprise Profile" in result["context"]
    assert "--- Chunk ID: [chunk-100] (Doc: doc-50, Name: Agreement.pdf) (Page 2) ---" in result["context"]
    assert "Termination requires 30 days notice." in result["context"]
    
    # Verify Question text
    assert result["question"] == "What is the notice period?"


def test_ai_chat_endpoint_success(client: TestClient) -> None:
    """Verifies RAG-augmented chatbot chat route processes instructions and returns citations & confidence."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    import app.services as services_module
    from app.config.settings import get_settings
    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()
        
    db.mock_db["companies"] = {
        "comp-abc": {
            "id": "comp-abc",
            "name": "Alpha Delta Corp"
        }
    }
    db.mock_db["embeddings"] = {
        "emb-chat-1": {
            "companyId": "comp-abc",
            "documentId": "doc-abc-1",
            "chunkId": "chunk-chat-1",
            "embeddingVector": [0.15] * 768,
            "content": "Alpha Delta financial returns exceeded forecasts.",
            "pageNumber": 2
        }
    }

    # Reset retrieve cached service
    services_module._retrieval_service = None
    
    payload = {
        "prompt": "What are the financial returns?",
        "system_instruction": "Answer concisely."
    }
    
    response = client.post("/ai/chat", headers=headers, json=payload)
    assert response.status_code == 200
    
    resp_data = response.json()
    assert resp_data["status"] == "success"
    assert resp_data["success"] is True
    
    data = resp_data["data"]
    assert "answer" in data
    assert "Mock response" in data["answer"]
    assert "citations" in data
    
    # Assert on structured citation dictionary elements
    assert len(data["citations"]) > 0
    citation_0 = data["citations"][0]
    assert citation_0["chunkId"] == "chunk-chat-1"
    assert citation_0["page"] == 2
    assert "Alpha Delta financial" in citation_0["text"]
    assert citation_0["similarity"] > 0.0

    assert "confidence" in data
    assert data["confidence"] > 0.0


def test_ai_chat_history_list_and_delete(client: TestClient) -> None:
    """Verifies retrieval, sorting order, and tenant-isolated deletion of chat history records."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    import app.services as services_module
    from app.config.settings import get_settings
    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()
        
    # Populate mock db
    mock_sessions = {
        "session-1": {
            "id": "session-1",
            "question": "What is company growth?",
            "answer": "Significant growth achieved.",
            "citations": [],
            "confidence": 0.9,
            "timestamp": "2026-07-21T01:00:00Z",
            "companyId": "comp-abc",
            "userId": "user123"
        },
        "session-2": {
            "id": "session-2",
            "question": "Show latest returns",
            "answer": "Returns are positive.",
            "citations": [],
            "confidence": 0.85,
            "timestamp": "2026-07-21T02:00:00Z",
            "companyId": "comp-abc",
            "userId": "user123"
        },
        "session-other-user": {
            "id": "session-other-user",
            "question": "Private information query",
            "answer": "Admin block.",
            "citations": [],
            "confidence": 0.95,
            "timestamp": "2026-07-21T03:00:00Z",
            "companyId": "comp-abc",
            "userId": "other-user-id"
        },
        "session-other-comp": {
            "id": "session-other-comp",
            "question": "External tenant question",
            "answer": "External response.",
            "citations": [],
            "confidence": 0.75,
            "timestamp": "2026-07-21T04:00:00Z",
            "companyId": "comp-different",
            "userId": "user123"
        }
    }
    db.mock_db["chat_sessions"] = mock_sessions

    # 1. Test GET /chat/history lists only the current user's matching company sessions
    response = client.get("/ai/chat/history", headers=headers)
    assert response.status_code == 200
    
    resp_data = response.json()
    assert resp_data["status"] == "success"
    history = resp_data["data"]
    
    # Must only match: session-1 & session-2 (same user & same company)
    assert len(history) == 2
    # Must be sorted by timestamp descending: session-2 (02:00) then session-1 (01:00)
    assert history[0]["id"] == "session-2"
    assert history[1]["id"] == "session-1"

    # 2. Test DELETE session-other-user raises 403 Forbidden because it belongs to another user
    err_response_1 = client.delete("/ai/chat/history/session-other-user", headers=headers)
    assert err_response_1.status_code == 403

    # 3. Test DELETE session-other-comp raises 403 Forbidden because it belongs to another company
    err_response_2 = client.delete("/ai/chat/history/session-other-comp", headers=headers)
    assert err_response_2.status_code == 403

    # 4. Test DELETE session-2 successfully purges target
    del_response = client.delete("/ai/chat/history/session-2", headers=headers)
    assert del_response.status_code == 200
    assert db.mock_db["chat_sessions"].get("session-2") is None

    # 5. Test DELETE non-existing ID returns 404
    err_response_3 = client.delete("/ai/chat/history/non-existent-session", headers=headers)
    assert err_response_3.status_code == 404




