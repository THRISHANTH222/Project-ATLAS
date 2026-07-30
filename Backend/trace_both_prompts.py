import requests
import json
from app.config.settings import Settings
from app.utils.firebase import initialize_firebase
from firebase_admin import firestore
from app.services.ai_service import GroqAIService
from app.services.db_service import FirestoreDbService
from app.services.retrieval_service import KnowledgeRetrievalService
import asyncio

settings = Settings()
initialize_firebase(settings)
db_service = FirestoreDbService(settings)
ai_service = GroqAIService(settings)
retrieval = KnowledgeRetrievalService(db_service, ai_service)

async def check_prompt(prompt):
    print(f"\n--- PROMPT ANALYSIS: '{prompt}' ---")
    chunks = await retrieval.retrieve_relevant_chunks(
        company_id="comp-atlas",
        query=prompt,
        top_k=5
    )
    sims = [float(c.get("similarity") or 0.0) for c in chunks]
    max_sim = max(sims) if sims else 0.0
    print(f"Retrieved Chunks Count: {len(chunks)}")
    print(f"Top 5 Similarities: {[round(s, 4) for s in sims]}")
    print(f"Max Similarity: {max_sim:.4f}")
    print(f"Threshold (SIMILARITY_THRESHOLD): {getattr(settings, 'SIMILARITY_THRESHOLD', 0.25)}")
    if max_sim < getattr(settings, 'SIMILARITY_THRESHOLD', 0.25):
        print("RESULT: Guardrail Triggered! (max_sim < 0.25) -> Backend returns 0.0% confidence and Insufficient Info message.")
    else:
        print("RESULT: Guardrail Passed! -> Backend returns Answer with >0% confidence.")

asyncio.run(check_prompt("What are the company security policies?"))
asyncio.run(check_prompt("What is the standard incident response time?"))
