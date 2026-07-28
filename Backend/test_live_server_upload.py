import requests
import json
import time

from app.config.settings import Settings
from app.utils.firebase import initialize_firebase
from firebase_admin import auth, firestore

print("=== TESTING UVIOCRN SERVER PID 11036 LIVE ENDPOINT ===")

# 1. Health check
res_health = requests.get("http://localhost:8000/health")
print(f"1. GET /health Status Code: {res_health.status_code}")
print("   Response:", json.dumps(res_health.json(), indent=2))

# 2. Check Firestore companies/comp-atlas BEFORE upload
settings = Settings()
initialize_firebase(settings)
db = firestore.client()

comp_before = db.collection("companies").document("comp-atlas").get()
print(f"\n2. Real Firestore 'companies/comp-atlas' BEFORE Upload:")
print(f"   Exists: {comp_before.exists}")

# 3. Perform Live HTTP POST /uploads to server PID 11036
pdf_content = (
    "PROJECT ATLAS ENTERPRISE LIVE RUNTIME VERIFICATION PDF\n"
    "Document ID: DOC-LIVE-FRESH-001\n"
    "Title: Corporate Governance & Security Compliance Standard\n"
    "Section 1: Data Protection Protocols\n"
    "All tenant data stored in Atlas is isolated using Cloud Firestore multi-tenant sub-collections.\n"
)

files = {"file": ("Enterprise_Security_Standard.pdf", pdf_content.encode("utf-8"), "application/pdf")}

headers = {"Authorization": "Bearer mock-token-live-user123__comp-atlas"}

# Test POST /auth/verify on live server PID 11036
res_ver = requests.post("http://localhost:8000/auth/verify", json={"token": "mock-token-live-user123__comp-atlas"})
print(f"\n3.1 POST /auth/verify (Live Server) Status Code: {res_ver.status_code}")
print("   Response:", json.dumps(res_ver.json(), indent=2))

# Send upload request to live server PID 11036
res_up = requests.post("http://localhost:8000/uploads", headers=headers, files=files, data={"folder": "compliance"})
print(f"\n3.2 POST /uploads (Live PID 11036 Server) Status Code: {res_up.status_code}")
up_json = res_up.json()
print("   Response:", json.dumps(up_json, indent=2))

# 4. Check Firestore companies/comp-atlas AFTER upload
time.sleep(1)
comp_after = db.collection("companies").document("comp-atlas").get()
print(f"\n4. Real Firestore 'companies/comp-atlas' AFTER Upload:")
print(f"   Exists: {comp_after.exists}")
if comp_after.exists:
    print(f"   Document Data: {json.dumps(comp_after.to_dict(), indent=2, default=str)}")

print("\n=== LIVE SERVER TEST COMPLETED ===")
