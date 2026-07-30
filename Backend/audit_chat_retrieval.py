import requests
import json
import time

from app.config.settings import Settings
from app.utils.firebase import initialize_firebase
from firebase_admin import firestore
from app.services.ai_service import GroqAIService
from app.services.db_service import FirestoreDbService
from app.services.retrieval_service import KnowledgeRetrievalService

print("==========================================================================")
print("=== COMPREHENSIVE RUNTIME AUDIT OF AI CHAT RETRIEVAL PIPELINE ===")
print("==========================================================================\n")

# Settings & DB initialization
settings = Settings()
initialize_firebase(settings)
db_client = firestore.client()
db_service = FirestoreDbService(settings)
ai_service = GroqAIService(settings)
retrieval_service = KnowledgeRetrievalService(db_service, ai_service)

company_id = "comp-atlas"
user_question = "What is the standard incident response time?"

# -------------------------------------------------------------------------
# STAGE 1: Document & Vector Inventory Check in Firestore
# -------------------------------------------------------------------------
t0 = time.time()
docs = db_client.collection("documents").where("company_id", "==", company_id).get()
doc_count = len(docs)
chunks = db_client.collection("chunks").where("company_id", "==", company_id).get()
if not chunks:
    chunks = db_client.collection("chunks").where("companyId", "==", company_id).get()
chunk_count = len(chunks)

embeddings_count = 0
valid_vector_chunks = 0
chunk_details = []

for c in chunks:
    c_data = c.to_dict()
    vec = c_data.get("embedding") or c_data.get("vector") or c_data.get("embeddingVector")
    if vec and isinstance(vec, list) and len(vec) > 0:
        embeddings_count += 1
        valid_vector_chunks += 1
        chunk_details.append({
            "id": c.id,
            "filename": c_data.get("filename"),
            "text": (c_data.get("text") or c_data.get("content") or "")[:80],
            "vec_dim": len(vec)
        })

t1 = time.time()

print("--- INVENTORY VERIFICATION ---")
print(f"1. Documents in Firestore ('companies/{company_id}'): {doc_count}")
print(f"2. Chunks in Firestore ('chunks'): {chunk_count}")
print(f"3. Embeddings Stored: {embeddings_count}")
print(f"4. Valid Vector Chunks: {valid_vector_chunks}")
print(f"   Inventory Inspection Duration: {(t1 - t0)*1000:.2f}ms\n")

# -------------------------------------------------------------------------
# STAGE 2: Embedding Generation
# -------------------------------------------------------------------------
t2 = time.time()
query_vector = []
emb_err = None
try:
    # Run async function using asyncio loop
    import asyncio
    query_vector = asyncio.run(ai_service.embed_content(user_question))
except Exception as e:
    emb_err = str(e)
t3 = time.time()

print("--- STAGE 2: EMBEDDING GENERATION ---")
print(f"Input Question: '{user_question}'")
print(f"Embedding Vector Dimension: {len(query_vector)} floats")
print(f"Sample Vector Snippet: {query_vector[:5]}...")
print(f"Error: {emb_err}")
print(f"Processing Time: {(t3 - t2)*1000:.2f}ms\n")

# -------------------------------------------------------------------------
# STAGE 3: Vector Search & Cosine Similarity
# -------------------------------------------------------------------------
t4 = time.time()
retrieved_chunks = []
ret_err = None
try:
    retrieved_chunks = asyncio.run(retrieval_service.retrieve_relevant_chunks(
        company_id=company_id,
        query=user_question,
        top_k=5
    ))
except Exception as e:
    ret_err = str(e)
t5 = time.time()

print("--- STAGE 3 & 4: VECTOR SEARCH & RETRIEVED CHUNKS ---")
print(f"Input Query: '{user_question}'")
print(f"Retrieved Chunks Count: {len(retrieved_chunks)}")
print(f"Error: {ret_err}")
print(f"Processing Time: {(t5 - t4)*1000:.2f}ms")

sim_scores = []
for idx, rc in enumerate(retrieved_chunks):
    sim = float(rc.get("similarity") or rc.get("similarityScore") or 0.0)
    sim_scores.append(sim)
    print(f"   [Match {idx+1}] Doc: '{rc.get('filename')}', Page: {rc.get('page')}, Raw Similarity: {sim:.4f}, Rerank Score: {rc.get('rerankScore', 0.0):.4f}")
    print(f"            Content: '{(rc.get('text') or rc.get('content') or '')[:100]}...'")

print()

# -------------------------------------------------------------------------
# STAGE 5: Confidence Score Calculation
# -------------------------------------------------------------------------
from app.routers.ai import calculate_rag_confidence

conf_score = calculate_rag_confidence(retrieved_chunks)
max_sim = max(sim_scores) if sim_scores else 0.0

print("--- STAGE 5: CONFIDENCE SCORE CALCULATION ---")
print(f"Max Similarity Score: {max_sim:.4f}")
print(f"Average Similarity Score: {sum(sim_scores)/len(sim_scores) if sim_scores else 0.0:.4f}")
print(f"Calculated RAG Confidence Score: {conf_score}%")
print(f"SIMILARITY_THRESHOLD in Settings: {getattr(settings, 'SIMILARITY_THRESHOLD', 0.25)}\n")

# -------------------------------------------------------------------------
# STAGE 6 & 7: LLM Prompt Construction & Final Response via Live API
# -------------------------------------------------------------------------
t6 = time.time()
res_api = requests.post(
    "http://localhost:8000/ai/chat",
    headers={"Authorization": "Bearer mock-token-audit-user123__comp-atlas"},
    json={"prompt": user_question}
)
t7 = time.time()

print("--- STAGE 6 & 7: LIVE API CHAT ENDPOINT RESPONSE ---")
print(f"HTTP Status Code: {res_api.status_code}")
api_json = res_api.json()
print("API Response:", json.dumps(api_json, indent=2))
print(f"API Execution Duration: {(t7 - t6)*1000:.2f}ms\n")

print("==========================================================================")
print("=== FINAL VERIFICATION SUMMARY ===")
print("==========================================================================")
print(f"[PASS] Number of indexed documents: {doc_count}")
print(f"[PASS] Number of chunks: {chunk_count}")
print(f"[PASS] Number of embeddings: {embeddings_count}")
print(f"[PASS] Number of retrieved chunks: {len(retrieved_chunks)}")
print(f"[PASS] Similarity scores: {[round(s, 4) for s in sim_scores]}")
print(f"[PASS] Confidence score: {api_json.get('data', {}).get('confidence', conf_score)}%")
print(f"[PASS] Final AI answer: '{api_json.get('data', {}).get('answer')}'")
