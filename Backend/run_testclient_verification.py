import os
import json
import time
import io
import pypdf

# Ensure test/dev environment for mock auth token acceptance while executing live code
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

TOKEN = "Bearer mock-token-dev-user123__comp-atlas-corp"
HEADERS = {"Authorization": TOKEN}

results_log = []

def log_section(title):
    msg = f"\n======================================================\n{title}\n======================================================"
    print(msg)
    results_log.append(msg)

def log_item(subtitle, data):
    msg = f"\n--- {subtitle} ---\n{data}"
    print(msg)
    results_log.append(msg)

log_section("1. AUTHENTICATION & HEALTH VERIFICATION")

# 1.1 Health Check
res_health = client.get("/health")
log_item("1.1 GET /health Status Code", res_health.status_code)
log_item("1.1 GET /health Response Body", json.dumps(res_health.json(), indent=2))
assert res_health.status_code == 200
assert res_health.json()["services"]["ai_service"]["status"] == "healthy"

# 1.2 Protected Endpoint Auth Check
res_auth_me = client.get("/ai/chat/history", headers=HEADERS)
log_item("1.2 GET /ai/chat/history (Protected Endpoint) Status Code", res_auth_me.status_code)
log_item("1.2 GET /ai/chat/history Response Body", json.dumps(res_auth_me.json(), indent=2))
assert res_auth_me.status_code == 200

log_section("2. DOCUMENT INGESTION VERIFICATION (PDF, DOCX, TXT, CSV)")

sample_pdf = (
    "PROJECT ATLAS ENTERPRISE PDF DOCUMENT\n"
    "Document ID: DOC-PDF-001\n"
    "Title: Corporate Travel & Expense Reimbursement Policy\n"
    "Section 1: Daily Meal Allowance\n"
    "Employees traveling on official company business are entitled to a daily meal allowance of $75 per day.\n"
    "All receipts over $25 must be uploaded to the Atlas portal within 5 business days.\n"
)

sample_docx = (
    "PROJECT ATLAS ENTERPRISE DOCX DOCUMENT\n"
    "Document ID: DOC-DOCX-002\n"
    "Title: IT Security & Password Enforcement Standard\n"
    "Section 1: Password Complexity Requirements\n"
    "All employee accounts must use passwords at least 16 characters in length containing uppercase, lowercase, numbers, and special symbols.\n"
    "Passwords expire every 90 days.\n"
)

sample_txt = (
    "PROJECT ATLAS ENTERPRISE TXT DOCUMENT\n"
    "Document ID: DOC-TXT-003\n"
    "Title: Health & Wellness Parental Leave Benefit\n"
    "Section 1: Paid Parental Leave\n"
    "Eligible full-time employees receive 16 weeks of 100% paid parental leave following the birth or adoption of a child.\n"
    "Leave can be taken continuously or in 2-week blocks within the first year.\n"
)

sample_xlsx = (
    "DocumentID,Title,Department,PolicyValue\n"
    "DOC-XLSX-004,Employee Equipment Stipend,Operations,$1200 Work From Home Hardware Allowance\n"
    "DOC-XLSX-004,Tuition Reimbursement,HR,$5000 Annual Education Assistance Grant\n"
)

files_to_test = [
    ("Company_Travel_Policy.pdf", sample_pdf.encode("utf-8"), "application/pdf"),
    ("IT_Security_Standard.docx", sample_docx.encode("utf-8"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ("Parental_Leave_Benefit.txt", sample_txt.encode("utf-8"), "text/plain"),
    ("Financial_Stipends.xlsx", sample_xlsx.encode("utf-8"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
]

uploaded_docs = []

for filename, content, content_type in files_to_test:
    files = {"file": (filename, content, content_type)}
    data = {"folder": "policies"}
    res_up = client.post("/uploads", headers=HEADERS, files=files, data=data)
    log_item(f"Upload {filename} Status Code", res_up.status_code)
    up_json = res_up.json()
    log_item(f"Upload {filename} Response", json.dumps(up_json, indent=2))
    assert res_up.status_code in (200, 201)
    doc_id = up_json["data"]["id"]
    uploaded_docs.append((doc_id, filename))

log_section("3. COMPANY DOCUMENTS & VECTOR INDEX VERIFICATION")

# 3.1 List Documents
res_list = client.get("/documents", headers=HEADERS)
log_item("3.1 GET /documents Status Code", res_list.status_code)
log_item("3.1 GET /documents Response", json.dumps(res_list.json(), indent=2))
assert res_list.status_code == 200

# 3.2 Vector Semantic Search via /retrieval/query
res_search = client.post("/retrieval/query", headers=HEADERS, json={"query": "paid parental leave weeks", "top_k": 5})
log_item("3.2 POST /retrieval/query 'paid parental leave weeks' Status Code", res_search.status_code)
log_item("3.2 Search Results", json.dumps(res_search.json(), indent=2))
assert res_search.status_code == 200

log_section("4. GROQ-POWERED AI CHAT & RAG ENGINE VERIFICATION")

# 4.1 Empty KB Refusal Guardrail Test
headers_empty = {"Authorization": "Bearer mock-token-empty-user__comp-empty-space"}
res_chat_empty = client.post("/ai/chat", headers=headers_empty, json={"prompt": "What is our remote work policy?"})
log_item("4.1 Empty KB Guardrail Status Code", res_chat_empty.status_code)
log_item("4.1 Empty KB Guardrail Response", json.dumps(res_chat_empty.json(), indent=2))
assert res_chat_empty.status_code == 200
assert res_chat_empty.json()["status"] == "failure"

# 4.2 Live Groq RAG Chat Query
payload_1 = {"prompt": "How many weeks of paid parental leave do eligible employees receive?"}
res_chat_1 = client.post("/ai/chat", headers=HEADERS, json=payload_1)
log_item("4.2 Chat Query (Paid Parental Leave) Status Code", res_chat_1.status_code)
chat_1_json = res_chat_1.json()
log_item("4.2 Chat Query Response", json.dumps(chat_1_json, indent=2))
assert res_chat_1.status_code == 200
assert chat_1_json["status"] == "success"
assert chat_1_json["data"]["answer"] is not None

# 4.3 Chat Debug Endpoint
res_debug = client.get("/ai/chat/debug", headers=HEADERS, params={"query": "paid parental leave"})
log_item("4.3 GET /ai/chat/debug Status Code", res_debug.status_code)
log_item("4.3 GET /ai/chat/debug Response", json.dumps(res_debug.json(), indent=2))
assert res_debug.status_code == 200

log_section("5. GROQ DOCUMENT VALIDATION REJECTION TEST (ACADEMIC PDF BLOCK)")

academic_content = (
    "CHAPTER 4: QUANTUM MECHANICS LECTURE NOTES\n"
    "Course: Physics 301 - University Study Material\n"
    "Homework Assignment 5: Calculate the wave function of a harmonic oscillator.\n"
)
files_acad = {"file": ("Physics_Homework_Assignment.pdf", academic_content.encode("utf-8"), "application/pdf")}
res_acad = client.post("/uploads", headers=HEADERS, files=files_acad, data={"folder": "homework"})
log_item("5. Academic PDF Upload Rejection Status Code", res_acad.status_code)
log_item("5. Academic PDF Rejection Response", json.dumps(res_acad.json(), indent=2))
assert res_acad.status_code == 400
assert res_acad.json()["error"] == "Unsupported document"

log_section("6. ALL END-TO-END VERIFICATIONS PASSED SUCCESSFULLY!")

with open("verification_evidence.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results_log))

print("\nVerification evidence written to verification_evidence.txt")
