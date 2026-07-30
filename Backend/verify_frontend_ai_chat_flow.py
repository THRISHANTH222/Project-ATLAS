import requests
import json

print("==========================================================================")
print("=== VERIFYING FRONTEND API CONTRACT & AI CHAT RETRIEVAL FLOW ===")
print("==========================================================================\n")

url = "http://localhost:8000/ai/chat"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer mock-token-dev-user__comp-atlas"
}
payload = {
    "prompt": "What is the standard incident response time?"
}

print(f"1. Request URL: {url}")
print(f"2. Method: POST")
print(f"3. Headers: {headers}")
print(f"4. Body: {json.dumps(payload)}\n")

res = requests.post(url, headers=headers, json=payload)

print(f"5. Response Status: {res.status_code}")
res_json = res.json()
print("6. Response JSON:\n", json.dumps(res_json, indent=2))

data = res_json.get("data", {})
confidence = data.get("confidence", 0.0)
answer = data.get("answer")
citations = data.get("citations", [])

print("\n--- FRONTEND RENDERING CONTRACT ASSERTIONS ---")
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
assert res_json.get("success") == True, "Expected success: true"
assert answer is not None, "Expected non-null answer"
assert confidence > 0.0, f"Expected confidence > 0.0, got {confidence}"
assert len(citations) > 0, "Expected citations list"

print(f"[PASS] HTTP Status Code: {res.status_code}")
print(f"[PASS] Success Flag: {res_json.get('success')}")
print(f"[PASS] AI Answer Text: '{answer}'")
print(f"[PASS] Confidence Score Rendered: {confidence}%")
print(f"[PASS] Citations Attached Count: {len(citations)}")
print("\n=== FRONTEND TO BACKEND INTEGRATION FLOW VERIFIED 100% ===")
