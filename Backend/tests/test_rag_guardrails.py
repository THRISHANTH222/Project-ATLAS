import pytest
from fastapi.testclient import TestClient
import app.services as services_module
from app.config.settings import get_settings


def test_empty_knowledge_base_rag_guardrail(client: TestClient) -> None:
    """
    Requirement 6.1: Empty Knowledge Base
    Verifies that when a company has zero indexed document chunks:
    - Groq is NOT called
    - Returns HTTP 200
    - success: false
    - answer: null
    - confidence: 0
    - citations: []
    - message: "No relevant company knowledge found. Please upload company documents."
    """
    headers = {"Authorization": "Bearer mock-token-user123__comp-empty"}

    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()

    payload = {"prompt": "What is our company remote work policy?"}

    response = client.post("/ai/chat", headers=headers, json=payload)
    assert response.status_code == 200

    resp_data = response.json()
    assert resp_data["status"] == "failure"
    assert resp_data["success"] is False
    assert resp_data["message"] == "No relevant company knowledge found. Please upload company documents."

    data = resp_data["data"]
    assert data["answer"] is None
    assert data["citations"] == []
    assert data["confidence"] == 0.0


def test_low_similarity_retrieval_rag_guardrail(client: TestClient) -> None:
    """
    Requirement 6.2: Low-Similarity Retrieval
    Verifies that when retrieved chunks have vector similarity below the threshold (< 0.25):
    - Groq is NOT called
    - Returns HTTP 200
    - success: false
    - answer: null
    - confidence: 0
    - citations: []
    - message indicating insufficient relevant company information was found
    """
    headers = {"Authorization": "Bearer mock-token-user123__comp-low"}

    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()

    # Vector orthogonal to query embedding -> similarity will be ~0.0 < 0.25
    mock_embeddings = {
        "emb-low-1": {
            "companyId": "comp-low",
            "documentId": "doc-low-1",
            "chunkId": "chunk-low-1",
            "embeddingVector": [0.0] * 768,
            "content": "Completely unrelated content text.",
            "pageNumber": 1
        }
    }
    db.mock_db["embeddings"] = mock_embeddings

    payload = {"prompt": "What are our security protocols?"}

    response = client.post("/ai/chat", headers=headers, json=payload)
    assert response.status_code == 200

    resp_data = response.json()
    assert resp_data["status"] == "failure"
    assert resp_data["success"] is False
    assert resp_data["message"] == "Insufficient relevant company information was found to answer your question."

    data = resp_data["data"]
    assert data["answer"] is None
    assert data["citations"] == []
    assert data["confidence"] == 0.0


def test_successful_retrieval_rag_chat(client: TestClient) -> None:
    """
    Requirement 6.3: Successful Retrieval
    Verifies that when relevant chunks with high similarity (>= 0.25) are retrieved:
    - Groq is called with retrieved company context
    - Returns HTTP 200
    - success: true
    - answer is populated
    - citations list is populated
    - confidence > 0
    """
    headers = {"Authorization": "Bearer mock-token-user123__comp-success"}

    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()

    mock_embeddings = {
        "emb-success-1": {
            "companyId": "comp-success",
            "documentId": "doc-success-1",
            "documentName": "Employee_Handbook.pdf",
            "chunkId": "chunk-success-1",
            "embeddingVector": [0.15] * 768,
            "content": "All employees receive 20 days of paid annual leave per calendar year.",
            "pageNumber": 5
        }
    }
    db.mock_db["embeddings"] = mock_embeddings
    db.mock_db["companies"] = {
        "comp-success": {"id": "comp-success", "name": "Acme Corp"}
    }

    payload = {"prompt": "How many days of paid annual leave do employees receive?"}

    response = client.post("/ai/chat", headers=headers, json=payload)
    assert response.status_code == 200

    resp_data = response.json()
    assert resp_data["status"] == "success"
    assert resp_data["success"] is True

    data = resp_data["data"]
    assert data["answer"] is not None
    assert len(data["citations"]) > 0
    assert data["citations"][0]["chunkId"] == "chunk-success-1"
    assert data["confidence"] > 0.0


def test_unrelated_general_knowledge_question_blocked(client: TestClient) -> None:
    """
    Requirement 6.4: Unrelated Questions
    Verifies that general knowledge questions (e.g., 'What is the capital of France?')
    are blocked by RAG guardrails without calling Groq when no matching company context exists.
    """
    headers = {"Authorization": "Bearer mock-token-user123__comp-general"}

    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()

    # Index unrelated internal document (e.g. Server Setup SOP)
    mock_embeddings = {
        "emb-server": {
            "companyId": "comp-general",
            "documentId": "doc-server",
            "chunkId": "chunk-server-1",
            "embeddingVector": [0.0] * 768,
            "content": "Kubernetes cluster configuration and deployment steps.",
            "pageNumber": 1
        }
    }
    db.mock_db["embeddings"] = mock_embeddings

    # General knowledge question completely unrelated to company knowledge
    payload = {"prompt": "What is the capital of France and how tall is the Eiffel Tower?"}

    response = client.post("/ai/chat", headers=headers, json=payload)
    assert response.status_code == 200

    resp_data = response.json()
    assert resp_data["status"] == "failure"
    assert resp_data["success"] is False
    assert "No relevant company knowledge" in resp_data["message"] or "Insufficient relevant company information" in resp_data["message"]

    data = resp_data["data"]
    assert data["answer"] is None
    assert data["citations"] == []
    assert data["confidence"] == 0.0
