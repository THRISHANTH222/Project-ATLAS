# Project Atlas - CRITICAL INVESTIGATION REPORT

**System**: Project Atlas Knowledge Retrieval & AI Generation Service  
**Auditor**: Principal Backend Auditor  
**Date**: July 25, 2026  
**Status**: Investigation Complete — No Code Modified  

---

## 1. Executive Summary

An audit was conducted to investigate an anomalous system behavior where the **Company Brain UI** reports an empty knowledge base:
- **Total Sources**: 0
- **Total Vectors**: 0
- **No uploaded documents**

However, the **AI Chat interface** continues answering user questions and displaying detailed source citations.

Our investigation evaluated both the FastAPI backend (`Backend/app/`) and Next.js frontend (`frontend/src/`) codebases. 

The audit revealed that **the backend RAG system and guardrails are functioning correctly and strictly enforce zero-chunk/zero-citation refusal**. The anomalous behavior occurs because **the Frontend UI is entirely disconnected from the Backend API**, operating as a standalone client-side mock with hardcoded keyword responses and static placeholder citation objects.

---

## 2. Findings on Audit Questions

### 1. Does `/ai/chat` call the retrieval engine before Gemini?
* **Backend API (`Backend/app/routers/ai.py`, L85–136)**: **YES.** The backend `/ai/chat` endpoint calls `retrieval.retrieve_relevant_chunks(company_id, query, top_k=5)` at Step 2, BEFORE invoking `PromptBuilder` (Step 3) and `ai.generate_content` (Gemini, Step 4).
* **Frontend AI Chat UI (`frontend/src/app/dashboard/chat/page.tsx`)**: **NO.** The frontend UI does not call `/ai/chat` or any backend endpoint. User prompts are processed locally inside a React client component.

### 2. How many chunks are retrieved for an empty knowledge base?
* **0 Chunks.** In `KnowledgeRetrievalService.retrieve_relevant_chunks` (`Backend/app/services/retrieval_service.py`, L184–206), the service queries the Firestore `embeddings` collection for documents matching `companyId == company_id`. When no document chunks exist for that company tenant, it returns an empty list `[]`.

### 3. Is Gemini invoked when zero chunks are found?
* **NO.** In `Backend/app/routers/ai.py` (L91–105), **RAG Guardrail 1** explicitly checks `if not chunks:`. When triggered, it logs a warning, bypasses prompt construction and Gemini invocation, and returns an `ApiResponse` failure payload:
  ```json
  {
    "status": "failure",
    "success": false,
    "message": "No relevant company knowledge found. Please upload company documents.",
    "data": {
      "answer": null,
      "citations": [],
      "confidence": 0.0
    }
  }
  ```

### 4. Where do the displayed citations originate?
* The displayed citations originate entirely from **hardcoded client-side mock objects** inside `frontend/src/app/dashboard/chat/page.tsx` (L97–130). 
* When a user prompt contains keywords like `"prd"`, `"guidelines"`, or `"auth"`, the component selects hardcoded citation objects:
  - `Project Atlas PRD.pdf` (Upload)
  - `Engineering Guidelines Wiki` (Notion)
  - `auth-service.ts` (GitHub)
  - `Q3 Strategy Slide-Deck.pdf` (Google Drive)

### 5. Are citations generated from Firestore, mock data, or another source?
* Citations are generated strictly from **hardcoded frontend mock data**. They do not originate from Firestore, vector database embeddings, or any backend service.

### 6. Are mock responses or fallback responses enabled?
* **Frontend UI**: **YES.** Mock responses and static citation generators are enabled by default and hardcoded into the component submit handler (`handleSendMessage`).
* **Backend API**: **NO.** Mock responses are disabled. The backend enforces strict RAG guardrail circuit breakers that explicitly refuse to answer when zero chunks are retrieved.

### 7. Is the frontend displaying placeholder citations?
* **YES.** The frontend displays placeholder citations defined in `frontend/src/app/dashboard/chat/page.tsx` whenever a user submits a query.

### 8. Are the Company Brain page and AI Chat using the same `companyId` and Firestore collections?
* **NO.** Neither page uses `companyId` or queries Firestore collections:
  - **Company Brain Page** ([frontend/src/app/dashboard/brain/page.tsx](file:///c:/Users/THRIS/Desktop/Project%20ATLAS/Project-ATLAS/frontend/src/app/dashboard/brain/page.tsx#L61-L76)) manages document items in browser `localStorage` (`atlas_mock_docs` and `atlas_mock_acts`).
  - **AI Chat Page** ([frontend/src/app/dashboard/chat/page.tsx](file:///c:/Users/THRIS/Desktop/Project%20ATLAS/Project-ATLAS/frontend/src/app/dashboard/chat/page.tsx#L36-L144)) manages state strictly in React `useState`.
  - Neither component connects to backend API routes or Firestore. When a user deletes all documents on the Company Brain page, only `localStorage` (`atlas_mock_docs`) is updated, which has zero effect on the AI Chat component state.

### 9. Does the Retrieval Debug endpoint agree with the AI Chat endpoint?
* **YES.**
  - Backend `/ai/chat/debug` (`Backend/app/routers/ai.py`, L341–426) queries `retrieval.retrieve_relevant_chunks` and returns `retrievedChunks: []`, `embeddingScore: 0.0`, and `confidence: 0.0` for an empty knowledge base.
  - Backend `/ai/chat` (`Backend/app/routers/ai.py`, L62–105) queries `retrieval.retrieve_relevant_chunks` and triggers RAG Guardrail 1, returning `answer: null`, `citations: []`, and `confidence: 0.0`.
  - Both backend endpoints agree 100%. The discrepancy is strictly between the Frontend UI (mock client) and the Backend API.

---

## 3. Execution Flow Diagrams

### Intended & Actual Backend Execution Flow (`/ai/chat`)
```
User Question (HTTP POST /ai/chat)
       │
       ▼
Tenant Authentication & company_id Extraction
       │
       ▼
KnowledgeRetrievalService.retrieve_relevant_chunks(company_id, query, top_k=5)
       │
       ├── Query Firestore 'embeddings' collection for companyId
       ▼
Empty Knowledge Base Check (chunks == [])
       │
       ├── RAG Guardrail 1 Triggered!
       │
       ▼
[BYPASSED] PromptBuilder.build_retrieval_prompt
       │
       ▼
[BYPASSED] IAIService.generate_content (Gemini API)
       │
       ▼
Response Returned: HTTP 200 OK
{
  "status": "failure",
  "success": false,
  "message": "No relevant company knowledge found. Please upload company documents.",
  "data": { "answer": null, "citations": [], "confidence": 0.0 }
}
```

### Actual Observed Frontend Execution Flow (`/dashboard/chat`)
```
User Question (Typed into Next.js Chat Input)
       │
       ▼
Form Submit Handler (handleSendMessage in page.tsx)
       │
       ▼
[BYPASSED] Backend HTTP Call (/ai/chat)
       │
       ▼
[BYPASSED] Knowledge Retrieval & Firestore Vector Search
       │
       ▼
[BYPASSED] Prompt Assembly & Gemini Invocation
       │
       ▼
Client-side setTimeout (1200ms delay simulation)
       │
       ▼
Keyword Matching on User Prompt string
       │
       ▼
Select Hardcoded Mock Text & Static Placeholder Citation Array
       │
       ▼
Update React Local State (messages, activeCitations)
       │
       ▼
Render Answer & Citations in UI
```

---

## 4. Single Root Cause

**ROOT CAUSE**:
The frontend application (`frontend/src/app/dashboard/chat/page.tsx` and `frontend/src/app/dashboard/brain/page.tsx`) is completely decoupled from the backend API. The AI Chat UI operates entirely as a standalone client-side mock using `setTimeout` and hardcoded static citation objects, while the Company Brain UI operates independently on browser `localStorage`. Because the frontend never connects to or invokes the backend `/ai/chat` API endpoint—where strict RAG guardrails are active and properly returning zero chunks/citations—the UI continues displaying simulated answers and placeholder citations even when the Company Brain UI displays 0 sources and 0 vectors.
