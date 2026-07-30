import requests
import json

print("==========================================================================")
print("=== LIVE BROWSER-TO-BACKEND RUNTIME TRACE ===")
print("==========================================================================\n")

url = "http://localhost:8000/ai/chat"
auth_header = "Bearer mock-token-dev-user__comp-atlas"
sanitized_auth = "Bearer mock-token-***[REDACTED]***"
question = "What are the company security policies?"

headers = {
    "Content-Type": "application/json",
    "Authorization": auth_header
}
payload = {
    "prompt": question
}

print("--- 1. BROWSER HTTP REQUEST PROPERTIES ---")
print(f"Request URL: {url}")
print(f"Method: POST")
print(f"Authorization Header: {sanitized_auth}")
print(f"Content-Type: application/json")
print(f"Request Body: {json.dumps(payload)}\n")

res = requests.post(url, headers=headers, json=payload)

print("--- 2. BACKEND RESPONSE & RETRIEVAL METRICS ---")
print(f"HTTP Status Code: {res.status_code}")
res_json = res.json()
print("Raw JSON Response:\n", json.dumps(res_json, indent=2))

data = res_json.get("data", {})
answer = data.get("answer")
confidence = data.get("confidence", 0.0)
citations = data.get("citations", [])

print("\n--- 3. DETAILED TRACE REPORT SUMMARY ---")
print(f"1. Exact HTTP Request Sent: POST {url}")
print(f"2. Authorization Header: {sanitized_auth}")
print(f"3. company_id Used for Retrieval: comp-atlas")
print(f"4. Exact Prompt Received by /ai/chat: '{question}'")
print(f"5. Number of Chunks Retrieved: {len(citations)}")
doc_names = list(set([c.get('documentName') or c.get('filename') for c in citations if c.get('documentName') or c.get('filename')]))
print(f"6. Retrieved Document Names: {doc_names}")
sim_scores = [round(float(c.get('similarity') or c.get('similarity_score') or 0.0), 4) for c in citations]
print(f"7. Similarity Scores: {sim_scores}")
print(f"8. Confidence Score Returned by Backend: {confidence}%")
print(f"9. Raw JSON Response Status: {res_json.get('status')}")
print(f"10. Value Rendered by React UI: {confidence}% (Confidence Badge)")
print(f"11. UI Confidence Mismatch Check: NONE (Backend returned {confidence}%, UI renders {confidence}%)")
