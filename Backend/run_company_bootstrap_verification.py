import json
import time

from app.config.settings import Settings
import app.config.settings as settings_module

test_settings_obj = Settings(
    ENVIRONMENT="development",
    FIREBASE_PROJECT_ID="test-project",
    FIREBASE_CREDENTIALS_PATH="", # mock auth
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

client = TestClient(app)

print("=== STARTING COMPANY BOOTSTRACTION & LINKAGE E2E VERIFICATION ===")

# 1. Test New User Registration with Auto-Created Company & User Records
reg_payload = {
    "email": "newtenant.admin@acmeenterprise.com",
    "password": "SecurePassword123!",
    "display_name": "Acme Admin"
}
res_reg = client.post("/auth/register", json=reg_payload)
print(f"\n1. POST /auth/register Status Code: {res_reg.status_code}")
reg_json = res_reg.json()
print("   Response:", json.dumps(reg_json, indent=2))
assert res_reg.status_code == 200
assert reg_json["status"] == "success"
assigned_company_id = reg_json["data"]["claims"]["company_id"]
assigned_uid = reg_json["data"]["uid"]
print(f"   Created Company ID: {assigned_company_id}")
print(f"   Created User UID: {assigned_uid}")

# 2. Test Existing / Fallback User Auth Verification (Auto-Bootstrapping missing company)
token_fallback = f"Bearer mock-token-{assigned_uid}__{assigned_company_id}"
headers_fallback = {"Authorization": token_fallback}

res_ver = client.post("/auth/verify", json={"token": f"mock-token-{assigned_uid}__{assigned_company_id}"})
print(f"\n2. POST /auth/verify Status Code: {res_ver.status_code}")
ver_json = res_ver.json()
print("   Response:", json.dumps(ver_json, indent=2))
assert res_ver.status_code == 200

# 3. Verify Upload Succeeds with Auto-Bootstrapped Tenant
sample_policy = (
    "PROJECT ATLAS ACME ENTERPRISE SECURITY POLICY\n"
    "Document ID: POL-ACME-2026\n"
    "Subject: Multi-Factor Authentication & Workspace Access Standard\n"
    "All employees must use FIDO2 security keys for VPN access.\n"
)
files = {"file": ("Acme_Security_Policy.txt", sample_policy.encode("utf-8"), "text/plain")}
res_up = client.post("/uploads", headers=headers_fallback, files=files, data={"folder": "policies"})
print(f"\n3. POST /uploads (Auto-Bootstrapped Company) Status Code: {res_up.status_code}")
up_json = res_up.json()
print("   Response:", json.dumps(up_json, indent=2))
assert res_up.status_code in (200, 201)
assert up_json["status"] == "success"

# 4. Verify Company Brain Loads Documents for Linked Tenant
res_docs = client.get("/documents", headers=headers_fallback)
print(f"\n4. GET /documents (Company Brain Listing) Status Code: {res_docs.status_code}")
docs_json = res_docs.json()
print("   Response:", json.dumps(docs_json, indent=2))
assert res_docs.status_code == 200
assert docs_json["status"] == "success"
assert len(docs_json["data"]) > 0
print(f"   Retrieved {len(docs_json['data'])} document(s) from Company Brain!")

print("\n=== ALL COMPANY BOOTSTRAP & LINKAGE VERIFICATIONS PASSED SUCCESSFULLY! ===")
