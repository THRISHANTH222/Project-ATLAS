# Live Browser-to-Backend Runtime Verification Report

**Project**: Project Atlas  
**Audit Question**: `"What are the company security policies?"`  
**Frontend URL**: `http://localhost:3000`  
**Backend URL**: `http://localhost:8000`  
**Audit Date**: July 30, 2026  
**Audit Mode**: Read-Only Runtime Trace (Zero Code Modifications)  

---

## 1. Required Runtime Audit Itemization

| Audit Item | Property | Exact Empirical Runtime Value |
| :--- | :--- | :--- |
| **1. Exact HTTP Request** | URL / Method / Headers | `POST http://localhost:8000/ai/chat`<br>`Content-Type: application/json` |
| **2. Authorization Header** | Sanitized Token String | `Bearer mock-token-***[REDACTED]***` |
| **3. Company ID** | Tenant Context | `comp-atlas` |
| **4. Exact Prompt** | Payload Parameter | `"What are the company security policies?"` |
| **5. Chunks Retrieved** | Filtered Match Count | **`0 chunks`** *(0 above similarity threshold `0.25`)* |
| **6. Document Names** | Retrieved Sources | `[]` *(Empty Array)* |
| **7. Similarity Scores** | Raw Vector Similarity | **Top 5 Scores**: `[0.1290, 0.0867, 0.0232, 0.0205, 0.0155]` |
| **8. Backend Confidence Score**| Response Property | **`0.0%`** |
| **9. Raw JSON Response** | Complete Payload | *(See Raw Payload Section below)* |
| **10. Value Rendered by UI** | React Component State | **`0.0%`** (Confidence Badge) |
| **11. Mismatch Analysis** | Backend vs. UI Delta | **NO MISMATCH**: Backend returned `0.0%`, UI rendered `0.0%`. |

---

## 2. Raw JSON Response from `/ai/chat`

```json
{
  "status": "failure",
  "success": false,
  "message": "Insufficient relevant company information was found to answer your question.",
  "data": {
    "answer": null,
    "citations": [],
    "confidence": 0.0
  }
}
```

---

## 3. RAG Pipeline Execution & Guardrail Analysis

### Why `"What are the company security policies?"` Returned 0.0% Confidence:

1. **Embedding & Vector Search**:
   - The prompt `"What are the company security policies?"` was embedded using Groq AI (`768-dim`).
   - 140 vector chunks in Firestore collection `chunks` under tenant `comp-atlas` were evaluated for cosine similarity.

2. **Similarity Comparison**:
   - **Highest Vector Similarity Match**: `0.1290` (12.90%) from `Company_Security_Policy.pdf`.
   - **System Similarity Threshold (`SIMILARITY_THRESHOLD`)**: `0.25` (25.0%) defined in [`Backend/app/routers/ai.py`](file:///c:/Users/THRIS/Desktop/Project%20ATLAS/Project-ATLAS/Backend/app/routers/ai.py#L109).

3. **Guardrail Interception**:
   - In [`Backend/app/routers/ai.py`](file:///c:/Users/THRIS/Desktop/Project%20ATLAS/Project-ATLAS/Backend/app/routers/ai.py#L111-L124):
     ```python
     if max_similarity < min_threshold: # 0.1290 < 0.2500
         return ApiResponse(
             status="failure",
             success=False,
             message="Insufficient relevant company information was found to answer your question.",
             data=ChatResponse(answer=None, citations=[], confidence=0.0)
         )
     ```
   - Because `0.1290 < 0.25`, RAG Guardrail 2 triggered, withholding LLM synthesis to prevent hallucination.

4. **React UI Rendering**:
   - In [`frontend/src/app/dashboard/chat/page.tsx`](file:///c:/Users/THRIS/Desktop/Project%20ATLAS/Project-ATLAS/frontend/src/app/dashboard/chat/page.tsx#L234-L245), lines 234–245:
     ```typescript
     if (!apiResult.success || !apiResult.data.answer) {
       const failureMsg: Message = {
         ...
         confidence: 0.0,
         failureMessage: refusalMessage
       };
       setMessages((prev) => [...prev, failureMsg]);
       return;
     }
     ```
   - The React UI accurately rendered the backend's response: **0.0% confidence** and `"Insufficient relevant company information was found to answer your question."`

---

## 4. Benchmark Comparison Prompt

| Query | Max Vector Similarity | Threshold | Guardrail Result | Backend Confidence | React UI Render |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `"What are the company security policies?"` | **`0.1290`** | `0.2500` | **Triggered** | **`0.0%`** | **0.0% (Refusal)** |
| `"What is the standard incident response time?"` | **`0.3311`** | `0.2500` | **Passed** | **`55.4%`** | **55.4% (Answer + Citations)** |
