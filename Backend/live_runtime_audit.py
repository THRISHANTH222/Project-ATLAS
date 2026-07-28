import os
import sys
import json
import subprocess
import requests
from app.config.settings import get_settings
from app.services import get_db_service
from app.utils.firebase import initialize_firebase
import firebase_admin
from firebase_admin import auth, firestore

print("=== STARTING LIVE RUNTIME AUDIT ===")

settings = get_settings()

# 1. Inspect Running Server Process (Uvicorn port 8000)
try:
    netstat_output = subprocess.check_output("netstat -ano | findstr :8000", shell=True).decode()
    lines = netstat_output.strip().split("\n")
    pid = lines[0].strip().split()[-1] if lines else "Unknown"
    wmic_out = subprocess.check_output(f"wmic process where processid={pid} get creationdate,commandline", shell=True).decode()
    print(f"\n1. Running Uvicorn Server Process on Port 8000:")
    print(f"   PID: {pid}")
    print(f"   WMIC Details:\n{wmic_out.strip()}")
except Exception as proc_err:
    print(f"\n1. Running Uvicorn Server Process: Error retrieving process details: {proc_err}")

# 2. Query Firestore Database Live
initialized = initialize_firebase(settings)
print(f"\n2. Firebase Admin SDK Initialized: {initialized}")

db_service = get_db_service(settings)
print(f"   Database Mode: {'MOCK' if db_service.use_mock else 'PRODUCTION (Firestore)'}")

# Query Firestore directly using Firebase Admin SDK
db = firestore.client() if initialized else None

# Check companies/comp-atlas
comp_atlas_doc = None
comp_atlas_exists = False
if db:
    doc_ref = db.collection("companies").document("comp-atlas")
    doc_snap = doc_ref.get()
    comp_atlas_exists = doc_snap.exists
    if comp_atlas_exists:
        comp_atlas_doc = doc_snap.to_dict()

print(f"\n3. Firestore Document 'companies/comp-atlas':")
print(f"   Exists: {comp_atlas_exists}")
print(f"   Document Data: {json.dumps(comp_atlas_doc, indent=2, default=str)}")

# 4. Collection Counts in Firestore
companies_list = [d.id for d in db.collection("companies").stream()] if db else []
users_list = [d.id for d in db.collection("users").stream()] if db else []
documents_list = [d.id for d in db.collection("documents").stream()] if db else []

print(f"\n4. Firestore Collections Live Audit:")
print(f"   'companies' count: {len(companies_list)} | IDs: {companies_list}")
print(f"   'users' count: {len(users_list)} | IDs: {users_list}")
print(f"   'documents' count: {len(documents_list)} | IDs: {documents_list}")

# 5. Retrieve details for existing users in 'users' collection
user_docs_details = []
if db:
    for uid in users_list:
        udoc = db.collection("users").document(uid).get()
        user_docs_details.append({"id": uid, "data": udoc.to_dict()})

print(f"\n5. Live User Records in Firestore 'users' Collection:")
print(json.dumps(user_docs_details, indent=2, default=str))

# 6. Test Live Health Check & Running Server Behavior
res_health = requests.get("http://localhost:8000/health")
print(f"\n6. Running Server /health Endpoint:")
print(f"   Status Code: {res_health.status_code}")
print(f"   Response: {json.dumps(res_health.json(), indent=2)}")

# Save audit results to file
audit_summary = {
    "server_pid": pid,
    "comp_atlas_exists": comp_atlas_exists,
    "comp_atlas_doc": comp_atlas_doc,
    "companies_count": len(companies_list),
    "companies_ids": companies_list,
    "users_count": len(users_list),
    "users_ids": users_list,
    "documents_count": len(documents_list),
    "documents_ids": documents_list,
    "user_docs_details": user_docs_details,
}

with open("live_audit_results.json", "w", encoding="utf-8") as f:
    f.write(json.dumps(audit_summary, indent=2, default=str))

print("\n=== LIVE RUNTIME AUDIT COMPLETED SUCCESSFULLY ===")
