import pytest
from pydantic import BaseModel, Field

from app.config.settings import Settings
from app.services.auth_service import FirebaseAuthService
from app.services.db_service import FirestoreDbService
from app.services.storage_service import GcsStorageService
from app.services.ai_service import GeminiAIService
from app.utils.exceptions import AuthenticationError, DatabaseError, StorageError


@pytest.fixture
def local_settings() -> Settings:
    return Settings(
        ENVIRONMENT="development",
        FIREBASE_PROJECT_ID="mock-project",
        FIREBASE_CREDENTIALS_PATH="", # Forces mock mode
        STORAGE_PROVIDER="local",
        LOCAL_STORAGE_PATH="uploads/",
        GCS_BUCKET_NAME="mock-bucket",
        SUPABASE_URL="https://mock-bucket.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="mock-key",
        SUPABASE_BUCKET="mock-bucket",
        GEMINI_API_KEY="", # Forces mock mode
    )


@pytest.mark.asyncio
async def test_auth_service_mock_mode(local_settings: Settings) -> None:
    auth = FirebaseAuthService(local_settings)
    assert auth.use_mock is True

    # Test valid mock token format
    claims = await auth.verify_token("mock-token-jane")
    assert claims["uid"] == "jane"
    assert claims["email"] == "jane@example.com"

    # Test invalid mock token format
    with pytest.raises(AuthenticationError):
        await auth.verify_token("invalid-format-token")


@pytest.mark.asyncio
async def test_db_service_mock_mode(local_settings: Settings) -> None:
    db = FirestoreDbService(local_settings)
    assert db.use_mock is True

    # Test Create
    data = {"name": "Project Atlas", "active": True}
    doc_id = await db.create_document("projects", data, doc_id="atlas-1")
    assert doc_id == "atlas-1"

    # Test Get
    doc = await db.get_document("projects", "atlas-1")
    assert doc is not None
    assert doc["name"] == "Project Atlas"

    # Test Update
    await db.update_document("projects", "atlas-1", {"active": False})
    updated_doc = await db.get_document("projects", "atlas-1")
    assert updated_doc["active"] is False

    # Test Query
    results = await db.query_documents("projects", "active", "==", False)
    assert len(results) == 1
    assert results[0]["id"] == "atlas-1"

    # Test Delete
    await db.delete_document("projects", "atlas-1")
    deleted_doc = await db.get_document("projects", "atlas-1")
    assert deleted_doc is None

    # Test Batch Operations
    operations = [
        {"type": "create", "collection": "tasks", "id": "task-a", "data": {"title": "First task"}},
        {"type": "create", "collection": "tasks", "id": "task-b", "data": {"title": "Second task"}},
        {"type": "update", "collection": "tasks", "id": "task-a", "data": {"title": "Updated first task"}},
        {"type": "delete", "collection": "tasks", "id": "task-b", "data": {}}
    ]
    await db.execute_batch(operations)
    
    task_a = await db.get_document("tasks", "task-a")
    assert task_a is not None
    assert task_a["title"] == "Updated first task"
    
    task_b = await db.get_document("tasks", "task-b")
    assert task_b is None

    # Test connection closure does not crash
    await db.close_connection()


@pytest.mark.asyncio
async def test_storage_service_mock_mode(local_settings: Settings) -> None:
    storage = GcsStorageService(local_settings)
    assert storage.use_mock is True

    # Test upload and download
    blob_name = "reports/july.csv"
    content = b"header1,header2\nval1,val2"
    url = await storage.upload_file(content, blob_name, "text/csv")
    assert "mock-bucket" in url

    downloaded = await storage.download_file(blob_name)
    assert downloaded == content

    # Test presigned url string generation
    signed_url = await storage.generate_presigned_url(blob_name, method="PUT")
    assert "expires" in signed_url
    assert "PUT" in signed_url

    # Test List Files
    blob_a = "tenants/company123/invoices/inv001.pdf"
    blob_b = "tenants/company123/reports/rep001.xlsx"
    await storage.upload_file(b"pdf-content", blob_a, "application/pdf")
    await storage.upload_file(b"xlsx-content", blob_b, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    
    all_files = await storage.list_files()
    assert blob_a in all_files
    assert blob_b in all_files

    filtered_files = await storage.list_files(prefix="tenants/company123/invoices/")
    assert blob_a in filtered_files
    assert blob_b not in filtered_files

    # Test Generate Company Path
    path_without_folder = storage.generate_company_path("CompanyABC", "document.pdf")
    assert path_without_folder == "tenants/companyabc/document.pdf"

    path_with_folder = storage.generate_company_path("CompanyABC", "chart.png", folder="/assets/")
    assert path_with_folder == "tenants/companyabc/assets/chart.png"

    # Test delete
    await storage.delete_file(blob_name)
    await storage.delete_file(blob_a)
    await storage.delete_file(blob_b)
    with pytest.raises(StorageError):
        await storage.download_file(blob_name)


class MockSchema(BaseModel):
    name: str = Field(...)
    score: int = Field(...)


@pytest.mark.asyncio
async def test_ai_service_mock_mode(local_settings: Settings) -> None:
    ai = GeminiAIService(local_settings)
    assert ai.use_mock is True

    # Test text generation
    text = await ai.generate_content("hello")
    assert "Mock response" in text

    # Test structured JSON generation using schema fields
    schema_res = await ai.generate_json("parse this text", response_schema=MockSchema)
    assert schema_res["name"] == "mock_name"
    assert schema_res["score"] == 42

    # Test embedding generation
    vector = await ai.embed_content("embed me")
    assert len(vector) == 768
    assert vector[0] == 0.1
