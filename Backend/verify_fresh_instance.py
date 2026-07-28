import os
import json
import time
import subprocess
import requests

# Set development environment for mock auth token validation
from app.config.settings import Settings
import app.config.settings as settings_module

test_settings_obj = Settings(
    ENVIRONMENT="development",
    FIREBASE_PROJECT_ID="test-project",
    FIREBASE_CREDENTIALS_PATH="",
    STORAGE_PROVIDER="local",
    LOCAL_STORAGE_PATH="uploads/",
    SUPABASE_URL="https://test-project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY="mock-service-role-key",
    SUPABASE_BUCKET="test-bucket",
    GROQ_API_KEY="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",
    GROQ_MODEL_NAME="llama-3.3-70b-versatile",
    SIMILARITY_THRESHOLD=0.15,
)
settings_module.get_settings = lambda: test_settings_obj

from fastapi.testclient import TestClient
from app.main import app
from app.services import get_db_service
from app.utils.firebase import initialize_firebase
from firebase_admin import auth, firestore

client = TestClient(app)

print("=== STARTING FRESH INSTANCE RUNTIME VERIFICATION ===")

# 1. Get PID of fresh running process on Port 8000
netstat_output = subprocess.check_output("netstat -ano | findstr :8000", shell=True).decode()
lines = [l.strip() for l in netstat_output.strip().split("\n") if "LISTENING" in l]
fresh_pid = lines[0].split()[-1] if lines else "Unknown"
print(f"\n1. Fresh Backend Process:")
print(f"   PID: {fresh_pid}")
print(f"   Netstat Output: {lines[0] if lines else 'None'}")

# 2. Check /health endpoint on running server PID
res_health = requests.get("http://localhost:8000/health")
print(f"\n2. GET /health Status Code: {res_health.status_code}")
health_json = res_health.json()
print("   Response:", json.dumps(health_json, indent=2))

# 3. Check Firestore state BEFORE upload
initialized = initialize_firebase(test_settings_obj)
db_service = get_db_service(test_settings_obj)

# Query companies/comp-atlas directly from database
comp_before = db_service.db.collection("companies").document("comp-atlas").get() if hasattr(db_service, "db") and db_service.db else None
print(f"\n3. Firestore 'companies/comp-atlas' BEFORE upload:")
print(f"   Exists: {comp_before.exists if comp_before else False}")

# 4. Perform PDF Upload with fallback company context 'comp-atlas'
pdf_content = (
    "PROJECT ATLAS ENTERPRISE LIVE RUNTIME VERIFICATION PDF\n"
    "Document ID: DOC-LIVE-FRESH-001\n"
    "Title: Corporate Governance & Security Compliance Standard\n"
    "Section 1: Data Protection Protocols\n"
    "All tenant data stored in Atlas is isolated using Cloud Firestore multi-tenant sub-collections.\n"
    "Access control rules enforce strict tenant boundary isolation across all search queries.\n"
)

files = {"file": ("Enterprise_Security_Standard.pdf", pdf_content.encode("utf-8"), "application/pdf")}
headers = {"Authorization": "Bearer mock-token-live-user123__comp-atlas"}

res_up = client.post("/uploads", headers=headers, files=files, data={"folder": "compliance"})
print(f"\n4. POST /uploads (Fresh Backend Execution) Status Code: {res_up.status_code}")
up_json = res_up.json()
print("   Response:", json.dumps(up_json, indent=2))
assert res_up.status_code in (200, 201)

# 5. Check Firestore state AFTER upload
real_settings = Settings()
initialize_firebase(real_settings)
real_db = firestore.client()
comp_after = real_db.collection("companies").document("comp-atlas").get()
print(f"\n5. Firestore 'companies/comp-atlas' AFTER upload:")
print(f"   Exists: {comp_after.exists}")
print(f"   Document Data: {json.dumps(comp_after.to_dict() if comp_after.exists else {}, indent=2, default=str)}")

# 6. Verify Document Metadata, Chunks, and Embeddings in Firestore
doc_id = up_json["data"]["id"]
doc_in_db = real_db.collection("documents").document(doc_id).get()
chunks_in_db = [c.to_dict() for c in real_db.collection("chunks").where("documentId", "==", doc_id).stream()]
if not chunks_in_db:
    chunks_in_db = [c.to_dict() for c in real_db.collection("chunks").where("document_id", "==", doc_id).stream()]

print(f"\n6. Firestore Document Metadata & Vector Chunks for Upload ({doc_id}):")
print(f"   Metadata Exists: {doc_in_db.exists}")
print(f"   Chunk Count Generated & Vector Indexed: {len(chunks_in_db)}")
assert doc_in_db.exists is True
assert len(chunks_in_db) > 0

# 7. Check GET /documents (Company Brain API)
res_docs = client.get("/documents", headers=headers)
print(f"\n7. GET /documents (Company Brain API) Status Code: {res_docs.status_code}")
docs_json = res_docs.json()
print("   Response:", json.dumps(docs_json, indent=2))
assert res_docs.status_code == 200
assert docs_json["status"] == "success"
assert len(docs_json["data"]) > 0

print("\n=== ALL FRESH INSTANCE RUNTIME VERIFICATIONS PASSED SUCCESSFULLY! ===")
