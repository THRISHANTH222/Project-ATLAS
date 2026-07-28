import pytest
from typing import Any
from fastapi.testclient import TestClient
from app.services.retrieval_service import KnowledgeRetrievalService
from app.services.base import IDatabaseService, IAIService
from app.utils.exceptions import AIServiceError, DatabaseError

# =========================================================================
# Mock Implementations for Direct Service Testing
# =========================================================================

class MockDbService(IDatabaseService):
    def __init__(self, data: list):
        self.data = data
        self.use_mock = True

    async def get_document(self, collection: str, doc_id: str):
        return None

    async def create_document(self, collection: str, data: dict, doc_id: str = None):
        return ""

    async def update_document(self, collection: str, doc_id: str, data: dict):
        pass

    async def delete_document(self, collection: str, doc_id: str):
        pass

    async def query_documents(self, collection: str, field_path: str, op_string: str, value: Any):
        # Emulate Firestore filter query
        results = []
        for doc in self.data:
            val = doc.get(field_path)
            if op_string == "==" and val == value:
                results.append(doc)
        return results

    async def close_connection(self):
        pass


class MockAiService(IAIService):
    def __init__(self, embed_mock_val=None):
        self.embed_mock_val = embed_mock_val or [0.1] * 768

    async def generate_content(self, prompt: str, system_instruction=None, history=None):
        return ""

    async def generate_json(self, prompt: str, response_schema, system_instruction=None):
        return {}

    async def embed_content(self, text: str):
        if text == "cause_error":
            raise RuntimeError("AI Service error")
        return self.embed_mock_val


# =========================================================================
# Cosine Similarity / Retrieval Service Unit Tests
# =========================================================================

@pytest.mark.asyncio
async def test_cosine_similarity_calculation() -> None:
    # 1. Test Cosine Similarity Math
    db = MockDbService([])
    ai = MockAiService()
    service = KnowledgeRetrievalService(db, ai)

    # Identical vectors -> similarity = 1.0
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    assert abs(service._cosine_similarity(v1, v2) - 1.0) < 1e-9

    # Orthogonal vectors -> similarity = 0.0
    v3 = [0.0, 1.0, 0.0]
    assert abs(service._cosine_similarity(v1, v3) - 0.0) < 1e-9

    # Empty/invalid vectors -> similarity = 0.0
    assert service._cosine_similarity([], v1) == 0.0
    assert service._cosine_similarity(v1, [1.0, 0.0]) == 0.0


@pytest.mark.asyncio
async def test_tenant_company_isolation() -> None:
    # Set up mock DB with chunks from different companies
    db_data = [
        {
            "companyId": "company-A",
            "documentId": "doc-1",
            "chunkId": "chunk-1",
            "embeddingVector": [1.0, 0.0, 0.0],
            "content": "This is company A text",
            "pageNumber": 1
        },
        {
            "companyId": "company-B",
            "documentId": "doc-2",
            "chunkId": "chunk-2",
            "embeddingVector": [1.0, 0.0, 0.0],
            "content": "This is company B text",
            "pageNumber": 1
        }
    ]

    db = MockDbService(db_data)
    ai = MockAiService([1.0, 0.0, 0.0])
    service = KnowledgeRetrievalService(db, ai)

    # Retrieve for company-A only
    results_a = await service.retrieve_relevant_chunks(company_id="company-A", query="query text", top_k=5)
    assert len(results_a) == 1
    assert results_a[0]["chunkId"] == "chunk-1"
    assert results_a[0]["chunkText"] == "This is company A text"

    # Retrieve for company-B only
    results_b = await service.retrieve_relevant_chunks(company_id="company-B", query="query text", top_k=5)
    assert len(results_b) == 1
    assert results_b[0]["chunkId"] == "chunk-2"
    assert results_b[0]["chunkText"] == "This is company B text"


@pytest.mark.asyncio
async def test_robust_metadata_extraction() -> None:
    # Set up mock DB with various schema layouts
    db_data = [
        # Layout 1: Root content and pageNumber
        {
            "companyId": "company-A",
            "documentId": "doc-1",
            "chunkId": "chunk-1",
            "embeddingVector": [1.0, 0.0, 0.0],
            "content": "Layout 1 text",
            "pageNumber": 2
        },
        # Layout 2: CamelCase/metadata nested chunkText and page
        {
            "companyId": "company-A",
            "metadata": {
                "documentId": "doc-2",
                "chunkId": "chunk-2",
                "chunkMetadata": {
                    "content": "Layout 2 nested text",
                    "page": 5
                }
            },
            "embeddingVector": [0.0, 1.0, 0.0]
        }
    ]

    db = MockDbService(db_data)
    ai = MockAiService([1.0, 0.0, 0.0])
    service = KnowledgeRetrievalService(db, ai)

    results = await service.retrieve_relevant_chunks(company_id="company-A", query="query text", top_k=5)
    assert len(results) == 2

    # Verify first item (Layout 1)
    assert results[0]["chunkId"] == "chunk-1"
    assert results[0]["documentId"] == "doc-1"
    assert results[0]["chunkText"] == "Layout 1 text"
    assert results[0]["pageNumber"] == 2

    # Verify second item (Layout 2)
    assert results[1]["chunkId"] == "chunk-2"
    assert results[1]["documentId"] == "doc-2"
    assert results[1]["chunkText"] == "Layout 2 nested text"
    assert results[1]["pageNumber"] == 5


@pytest.mark.asyncio
async def test_error_handling_graceful_failures() -> None:
    db = MockDbService([])
    ai = MockAiService()
    service = KnowledgeRetrievalService(db, ai)

    # 1. AI exception test
    with pytest.raises(AIServiceError):
        await service.retrieve_relevant_chunks(company_id="company-A", query="cause_error")


# =========================================================================
# HTTP Router REST Endpoint Integration Tests
# =========================================================================

def test_query_retrieval_endpoint_success(client: TestClient) -> None:
    """Verifies that the /retrieval/query endpoint processes valid query and returns chunks."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    # Pre-populate database with dummy chunk entries for company 'comp-abc'
    import app.services as services_module
    from app.config.settings import get_settings
    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()
    
    # Write some embeddings mock records directly into Firestore mock state
    mock_embeddings = {
        "emb-1": {
            "companyId": "comp-abc",
            "documentId": "doc-abc-1",
            "chunkId": "chunk-abc-1",
            "embeddingVector": [0.15] * 768,
            "content": "SaaS growth drivers in 2026 include product led growth and AI integrations.",
            "pageNumber": 3
        },
        "emb-2": {
            "companyId": "comp-abc",
            "documentId": "doc-abc-1",
            "chunkId": "chunk-abc-2",
            "embeddingVector": [0.5] + [0.0] * 767,
            "content": "Unrelated topic text content.",
            "pageNumber": 4
        },
        "emb-other": {
            "companyId": "comp-other",
            "documentId": "doc-other-1",
            "chunkId": "chunk-other-1",
            "embeddingVector": [0.15] * 768,
            "content": "This belongs to another company.",
            "pageNumber": 1
        }
    }
    
    # Populate mock DB state
    db.mock_db["embeddings"] = mock_embeddings

    payload = {
        "query": "SaaS growth drivers",
        "top_k": 3
    }

    response = client.post("/retrieval/query", headers=headers, json=payload)
    assert response.status_code == 200

    resp_data = response.json()
    assert resp_data["status"] == "success"
    assert resp_data["success"] is True
    
    results = resp_data["data"]
    # Should only retrieve from comp-abc, never comp-other
    assert len(results) == 2
    
    # First match should be the PLG growth text due to higher vector similarity score
    assert results[0]["chunkId"] == "chunk-abc-1"
    assert results[0]["documentId"] == "doc-abc-1"
    assert results[0]["pageNumber"] == 3
    assert "SaaS growth drivers" in results[0]["chunkText"]
    assert results[0]["similarityScore"] > 0.0


def test_query_retrieval_endpoint_unauthorized(client: TestClient) -> None:
    """Verifies that missing auth credentials rejects requests with 401."""
    payload = {"query": "test query"}
    response = client.post("/retrieval/query", json=payload)
    assert response.status_code == 401


def test_query_retrieval_endpoint_invalid_payload(client: TestClient) -> None:
    """Verifies that empty query string fails input validations with 422."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    payload = {"query": "", "top_k": -5}
    response = client.post("/retrieval/query", headers=headers, json=payload)
    assert response.status_code == 422


def test_query_retrieval_endpoint_new_fields(client: TestClient) -> None:
    """Verifies that the new response fields (documentName, page, similarity, text) are returned."""
    headers = {"Authorization": "Bearer mock-token-user123__comp-abc"}
    
    import app.services as services_module
    from app.config.settings import get_settings
    db = services_module.get_db_service(get_settings())
    if hasattr(db, "mock_db"):
        db.mock_db.clear()
    
    mock_embeddings = {
        "emb-1": {
            "companyId": "comp-abc",
            "documentId": "doc-abc-1",
            "documentName": "Financial_Report.pdf",
            "chunkId": "chunk-abc-1",
            "embeddingVector": [0.15] * 768,
            "content": "SaaS growth drivers in 2026 include product led growth and AI integrations.",
            "pageNumber": 3
        }
    }
    db.mock_db["embeddings"] = mock_embeddings

    payload = {"query": "SaaS growth", "top_k": 1}
    response = client.post("/retrieval/query", headers=headers, json=payload)
    assert response.status_code == 200

    resp_data = response.json()
    item = resp_data["data"][0]
    
    assert item["chunkId"] == "chunk-abc-1"
    assert item["documentId"] == "doc-abc-1"
    assert item["documentName"] == "Financial_Report.pdf"
    assert item["page"] == 3
    assert item["similarity"] > 0.0
    assert "SaaS growth drivers" in item["text"]


@pytest.mark.asyncio
async def test_metadata_filtering_retrieval() -> None:
    # Set up mock DB with matching and non-matching metadata
    db_data = [
        {
            "companyId": "company-A",
            "documentId": "doc-1",
            "chunkId": "chunk-1",
            "embeddingVector": [1.0, 0.0, 0.0],
            "content": "This is company A text of SOP document type in Operations department.",
            "pageNumber": 1,
            "metadata": {
                "chunkMetadata": {
                    "documentType": "SOP",
                    "department": "Operations",
                    "keywords": ["sop", "procedures"],
                    "tags": ["sop", "operations"]
                }
            }
        },
        {
            "companyId": "company-A",
            "documentId": "doc-2",
            "chunkId": "chunk-2",
            "embeddingVector": [1.0, 0.0, 0.0],
            "content": "This is company A text of policy document type in HR department.",
            "pageNumber": 1,
            "metadata": {
                "chunkMetadata": {
                    "documentType": "HR Policy",
                    "department": "Human Resources",
                    "keywords": ["hr", "policy"],
                    "tags": ["hr", "policy"]
                }
            }
        }
    ]

    db = MockDbService(db_data)
    ai = MockAiService([1.0, 0.0, 0.0])
    service = KnowledgeRetrievalService(db, ai)

    # Force filter by SOP
    results = await service.retrieve_relevant_chunks(
        company_id="company-A",
        query="query text",
        top_k=5,
        document_type="SOP"
    )
    assert len(results) == 1
    assert results[0]["chunkId"] == "chunk-1"

    # Force filter by HR Policy type and HR department
    results_hr = await service.retrieve_relevant_chunks(
        company_id="company-A",
        query="query text",
        top_k=5,
        document_type="HR Policy",
        department="Human Resources"
    )
    assert len(results_hr) == 1
    assert results_hr[0]["chunkId"] == "chunk-2"

    # Query with mismatching department returns empty
    results_empty = await service.retrieve_relevant_chunks(
        company_id="company-A",
        query="query text",
        top_k=5,
        document_type="SOP",
        department="Finance"
    )
    assert len(results_empty) == 0


@pytest.mark.asyncio
async def test_semantic_reranking_accuracy() -> None:
    # Set up mock DB with two candidates
    db_data = [
        {
            "companyId": "company-A",
            "documentId": "doc-1",
            "chunkId": "chunk-1",
            "embeddingVector": [0.95, 0.05, 0.0],
            "content": "This is a generic text about corporate rules.",
            "pageNumber": 1,
            "metadata": {
                "chunkMetadata": {
                    "keywords": ["corporate", "rules"],
                    "tags": ["corporate"],
                    "heading": "General Section"
                }
            }
        },
        {
            "companyId": "company-A",
            "documentId": "doc-2",
            "chunkId": "chunk-2",
            "embeddingVector": [0.8, 0.2, 0.0],
            "content": "Detailed guidelines regarding annual employee leaves policy and vacations.",
            "pageNumber": 1,
            "metadata": {
                "chunkMetadata": {
                    "keywords": ["employee", "leaves", "policy", "vacations"],
                    "tags": ["leaves", "policy"],
                    "heading": "Employee Leaves Policy"
                }
            }
        }
    ]

    db = MockDbService(db_data)
    ai = MockAiService([1.0, 0.0, 0.0])
    service = KnowledgeRetrievalService(db, ai)

    # Query matching specifically Leaves Policy
    results = await service.retrieve_relevant_chunks(
        company_id="company-A",
        query="employee leaves policy and annual vacations",
        top_k=5
    )
    
    assert len(results) == 2
    # Detailed leaves policy should be reranked to rank 1 (chunk-2)
    assert results[0]["chunkId"] == "chunk-2"


