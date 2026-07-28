import requests
import json
import time

BASE_URL = "http://localhost:8000"
TOKEN = "Bearer mock-token-live-user123"
HEADERS = {"Authorization": TOKEN}

print("=== STARTING GROQ MIGRATION LIVE API VERIFICATION ===")

# 1. Health Check
res = requests.get(f"{BASE_URL}/health")
print(f"\n1. GET /health Status: {res.status_code}")
health_data = res.json()
print("   Response:", json.dumps(health_data, indent=2))
assert res.status_code == 200
assert health_data["services"]["ai_service"]["status"] == "healthy"

# 2. Empty Knowledge Base RAG Refusal Guardrail Test
headers_empty = {"Authorization": "Bearer mock-token-empty-company-tenant-456"}
res_chat_empty = requests.post(
    f"{BASE_URL}/ai/chat",
    headers=headers_empty,
    json={"prompt": "What is our company remote work policy?"}
)
print(f"\n2. Empty KB /ai/chat Guardrail Status: {res_chat_empty.status_code}")
chat_empty_json = res_chat_empty.json()
print("   Response:", json.dumps(chat_empty_json, indent=2))
assert res_chat_empty.status_code == 200
assert chat_empty_json["status"] == "failure"
assert chat_empty_json["success"] is False
assert chat_empty_json["data"]["answer"] is None
assert chat_empty_json["data"]["confidence"] == 0.0
assert chat_empty_json["data"]["citations"] == []
assert "No relevant company knowledge found" in chat_empty_json["message"]

# 3. Document Upload & Groq Document Validation Agent Classification Test
sample_policy = (
    "PROJECT ATLAS ENTERPRISE ACME CORP POLICY MANUAL\n"
    "Document ID: POL-2026-88\n"
    "Subject: Remote Work & Annual Vacation Leave Policy\n"
    "1. Annual Leave: Employees receive 25 days of paid annual vacation leave per calendar year.\n"
    "2. Work Hours: Standard working hours are 9:00 AM to 5:00 PM EST.\n"
    "3. Security Protocol: Multi-Factor Authentication (MFA) is strictly required on all devices.\n"
)

files = {
    "file": ("Acme_Company_Policy.txt", sample_policy.encode("utf-8"), "text/plain")
}
data = {"folder": "policies"}

res_upload = requests.post(
    f"{BASE_URL}/uploads",
    headers=HEADERS,
    files=files,
    data=data
)
print(f"\n3. POST /uploads (Classification & Ingestion) Status: {res_upload.status_code}")
upload_json = res_upload.json()
print("   Response:", json.dumps(upload_json, indent=2))
assert res_upload.status_code in (200, 201)
assert upload_json["status"] == "success"
assert upload_json["data"]["filename"] == "Acme_Company_Policy.txt"

# Wait for background ingestion pipeline
time.sleep(2)

# 4. Company Brain Vector Search / Retrieval Engine Test
res_search = requests.get(
    f"{BASE_URL}/company-brain/search",
    headers=HEADERS,
    params={"q": "paid annual vacation leave policy"}
)
print(f"\n4. GET /company-brain/search Status: {res_search.status_code}")
search_json = res_search.json()
print("   Response:", json.dumps(search_json, indent=2))
assert res_search.status_code == 200

# 5. Live Groq AI Chat & Citation & Confidence Test
chat_payload = {
    "prompt": "How many days of annual vacation leave do employees receive under the policy?"
}
res_chat = requests.post(
    f"{BASE_URL}/ai/chat",
    headers=HEADERS,
    json=chat_payload
)
print(f"\n5. POST /ai/chat (Groq llama-3.3-70b-versatile RAG) Status: {res_chat.status_code}")
chat_json = res_chat.json()
print("   Response:", json.dumps(chat_json, indent=2))
assert res_chat.status_code == 200
assert chat_json["status"] == "success"
assert chat_json["success"] is True
assert chat_json["data"]["answer"] is not None
assert len(chat_json["data"]["citations"]) > 0
assert chat_json["data"]["confidence"] > 0.0

# 6. Chat Debug Endpoint Test
res_debug = requests.get(
    f"{BASE_URL}/ai/chat/debug",
    headers=HEADERS,
    params={"query": "annual vacation leave policy"}
)
print(f"\n6. GET /ai/chat/debug Status: {res_debug.status_code}")
debug_json = res_debug.json()
print("   Response:", json.dumps(debug_json, indent=2))
assert res_debug.status_code == 200
assert debug_json["status"] == "success"

print("\n=== ALL LIVE GROQ VERIFICATIONS PASSED SUCCESSFULLY! ===")
