from app.config.settings import Settings
from app.utils.firebase import initialize_firebase
from firebase_admin import firestore

settings = Settings()
initialize_firebase(settings)
db = firestore.client()

print("--- FIRESTORE COMPANIES ---")
companies = db.collection("companies").get()
for c in companies:
    print(f"Company ID: {c.id} -> {c.to_dict()}")

print("\n--- FIRESTORE USERS ---")
users = db.collection("users").get()
for u in users:
    print(f"User ID: {u.id} -> Email: {u.to_dict().get('email')}, Company ID: {u.to_dict().get('company_id') or u.to_dict().get('companyId')}")

print("\n--- FIRESTORE DOCUMENTS BY COMPANY ---")
docs = db.collection("documents").get()
company_doc_counts = {}
for d in docs:
    d_data = d.to_dict()
    cid = d_data.get("company_id") or d_data.get("companyId") or "UNKNOWN"
    company_doc_counts[cid] = company_doc_counts.get(cid, 0) + 1
    print(f"Doc ID: {d.id} | Filename: {d_data.get('filename')} | Company ID: {cid}")

print("\nSummary Doc Counts by Company:", company_doc_counts)

print("\n--- FIRESTORE CHUNKS BY COMPANY ---")
chunks = db.collection("chunks").get()
company_chunk_counts = {}
for ch in chunks:
    ch_data = ch.to_dict()
    cid = ch_data.get("company_id") or ch_data.get("companyId") or "UNKNOWN"
    company_chunk_counts[cid] = company_chunk_counts.get(cid, 0) + 1

print("Summary Chunk Counts by Company:", company_chunk_counts)
