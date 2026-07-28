# Project Atlas - Frontend API Verification Matrix

**System**: Project Atlas Next.js Frontend App Router  
**Verification Scope**: Contract Alignment with `Frontend_API_Contract_v2.md` and FastAPI Routers  
**Date**: July 25, 2026  
**Status**: VERIFIED — All Endpoints Integrated & Validated  

---

## 1. Executive Summary

This document verifies the API integration layer between the Next.js frontend application (`frontend/src/`) and the FastAPI backend service (`Backend/app/`). All API invocations pass strict schema definitions, authentication headers (`Authorization: Bearer <token>`), and standard JSON/multipart payload standards.

---

## 2. API Endpoint Verification Matrix

| Endpoint | Verb | Contract Schema | Frontend Service Method | Verification Status | Notes |
|---|---|---|---|---|---|
| `/uploads` | `POST` | `multipart/form-data` (`file`, `folder`) | `uploadDocument(file, folder)` | **PASSED** | Captures 400 Bad Request rejection responses (`{ "success": false, "reason": "..." }`) and displays alert banner. |
| `/ai/chat` | `POST` | `application/json` (`prompt`, `system_instruction`) | `processChatPrompt(prompt)` | **PASSED** | Receives `answer`, `citations` (with document, heading, department, page), and `confidence`. Enforces RAG guardrails. |
| `/ai/chat/debug` | `GET` | Query param `?query={term}` | `getChatDebug(query)` | **PASSED** | Developer Mode metrics: Retrieved Chunks, Similarity, Response Time, Confidence, Prompt Length. Hidden by default. |
| `/ai/chat/history` | `GET` | Standard JSON array response | `getChatHistory()` | **PASSED** | Loads user chat history sessions on mount and formats message thread. |
| `/ai/chat/history/{id}` | `DELETE` | Path param `id` | `deleteChatHistoryItem(id)` | **PASSED** | Clears session logs from backend storage. |
| `/retrieval/query` | `POST` | `application/json` (`query`, `top_k`, `documentType`, `department`) | `queryRetrieval(query, top_k)` | **PASSED** | Performs vector cosine similarity precision chunk search. |
| `/documents/{id}` | `DELETE` | Path param `id` | `deleteDocumentApi(id)` | **PASSED** | Purges storage object and Firestore metadata. |

---

## 3. Capabilities Verification Detail

### 1. Upload Validation
- **Trigger**: Upload academic study guide or unsupported non-company file via `/dashboard/brain`.
- **Expected Backend Response**: `HTTP 400 Bad Request` `{ "error": "Unsupported document", "reason": "Document validation checks failed: Classified as Rejected category..." }`
- **Frontend Behavior**: `uploadDocument` in `lib/api.ts` parses the 400 error payload, sets `uploadErrorReason`, and renders a red alert banner in the upload modal.

### 2. Confidence Badging
- **Score $\ge$ 80%**: Renders **Green Badge** (`High Confidence`).
- **Score 60% – 79%**: Renders **Yellow Badge** (`Medium Confidence`).
- **Score < 60%**: Renders **Red Badge** (`Low Confidence`).

### 3. Enhanced Citations
- Citation chips in chat bubbles and context panel render `Document`, `Heading`, `Department`, and `Page` without placeholder strings.

### 4. Developer Mode
- Header toggle button defaults to **OFF** (`isDevModeEnabled = false`).
- When toggled **ON**, calls `GET /ai/chat/debug?query={term}` and populates debug telemetry bar with:
  - `Retrieved Chunks` (array count)
  - `Embedding Score` (similarity)
  - `Response Time` (ms)
  - `Confidence` (%)
  - `Prompt Length` (chars)

### 5. Source Viewer
- Clicking any citation item opens modal displaying `Document`, `Heading`, `Page`, `Department`, `Similarity Score`, and complete `Text` content.
