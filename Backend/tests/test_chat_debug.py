import pytest
from fastapi.testclient import TestClient

def test_chat_debug_endpoint_success(client: TestClient) -> None:
    # 1. Authorize as developer (contains "developer" in uid mock pattern)
    headers = {"Authorization": "Bearer mock-token-developerabc__comp-abc"}
    
    # Pre-populate database with dummy entities for comp-abc
    import app.services as services_module
    from app.config.settings import get_settings
    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()
        
    db.mock_db["embeddings"] = {
        "emb-1": {
            "companyId": "comp-abc",
            "documentId": "doc-abc-1",
            "chunkId": "chunk-abc-1",
            "embeddingVector": [0.15] * 768,
            "content": "SOP procedural steps for server setups.",
            "pageNumber": 3,
            "metadata": {
                "chunkMetadata": {
                    "heading": "Environment Setup",
                    "section": "Clause 1.2"
                }
            }
        }
    }
    db.mock_db["companies"] = {
        "comp-abc": {
            "id": "comp-abc",
            "name": "Acme Corp"
        }
    }

    response = client.get("/ai/chat/debug?query=server", headers=headers)
    assert response.status_code == 200

    resp_data = response.json()
    assert resp_data["status"] == "success"
    assert resp_data["success"] is True
    
    data = resp_data["data"]
    assert data["query"] == "server"
    assert data["promptLength"] > 0
    assert data["confidence"] > 0
    assert len(data["retrievedChunks"]) == 1
    
    chunk = data["retrievedChunks"][0]
    assert chunk["chunkId"] == "chunk-abc-1"
    assert chunk["page"] == 3
    assert chunk["heading"] == "Environment Setup"
    assert chunk["similarity"] > 0


def test_chat_debug_endpoint_unauthorized_user(client: TestClient) -> None:
    # 1. Authorize as standard user (non-dev, non-admin, non-developer)
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    response = client.get("/ai/chat/debug?query=server", headers=headers)
    assert response.status_code == 403
