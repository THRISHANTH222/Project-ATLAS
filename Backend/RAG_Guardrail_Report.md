# Project Atlas: RAG Guardrail Architecture & Technical Report

**Author:** Principal AI Backend Engineer  
**System:** Project Atlas Knowledge Retrieval & AI Generation Service  
**Date:** July 25, 2026  
**Scope:** Strict Retrieval-Augmented Generation (RAG) Guardrail Circuit Breaker Implementation  

---

## 1. Executive Summary

This report documents the architectural design, security guardrails, circuit breaker mechanics, and verification results for the strict **Retrieval-Augmented Generation (RAG)** guardrail system introduced to the `/ai/chat` endpoint in Project Atlas.

### The Problem
Previously, if a user queried the AI Chatbot when no company documents were uploaded, or when retrieved chunks yielded zero/low semantic similarity, the application fell back to invoking Gemini directly. Consequently, Gemini answered user queries using its internal pre-trained general knowledge rather than company-specific knowledge. In an enterprise SaaS environment, this behavior risks hallucinations, out-of-context answers, and data compliance violations.

### The Solution
A two-tier **RAG Guardrail Circuit Breaker** was implemented inside the `/ai/chat` handler (`app/routers/ai.py`):
1. **Empty Knowledge Base Guardrail**: Intercepts requests where 0 candidate chunks are retrieved for the user's company tenant space. Gemini is **NOT** invoked.
2. **Low-Similarity Threshold Guardrail**: Intercepts requests where retrieved chunks exist, but the maximum vector cosine similarity score is below `SIMILARITY_THRESHOLD` (configured at `0.25`). Gemini is **NOT** invoked.

In both circuit-breaker scenarios, the system immediately short-circuits and returns HTTP 200 with `success: false`, `answer: null`, `confidence: 0.0`, `citations: []`, and an explicit diagnostic message explaining the refusal reason.

---

## 2. Guardrail Circuit Breaker Workflow

```mermaid
graph TD
    UserQuery[User Query Incoming] --> Authenticate[Authenticate & Tenant Isolation]
    Authenticate --> Retrieve[KnowledgeRetrievalService.retrieve_relevant_chunks]
    
    Retrieve --> CheckEmpty{Are candidate chunks > 0?}
    CheckEmpty -- No --> CircuitBreaker1[Circuit Breaker 1: Empty Knowledge Base]
    CircuitBreaker1 --> ReturnNoDocs[Return HTTP 200: success=False, answer=null, confidence=0, citations=[], message="No relevant company knowledge found..."]
    
    CheckEmpty -- Yes --> CheckThreshold{Is max similarity >= SIMILARITY_THRESHOLD (0.25)?}
    CheckThreshold -- No --> CircuitBreaker2[Circuit Breaker 2: Low Similarity Score]
    CircuitBreaker2 --> ReturnLowSim[Return HTTP 200: success=False, answer=null, confidence=0, citations=[], message="Insufficient relevant company information..."]
    
    CheckThreshold -- Yes --> BuildPrompt[PromptBuilder: Strict Context Assembly]
    BuildPrompt --> CallGemini[Gemini API: generate_content]
    CallGemini --> ReturnSuccess[Return HTTP 200: success=True, answer=Text, citations=[...], confidence=Score]
```

---

## 3. Detailed Circuit Breaker Mechanics

### Guardrail 1: Empty Knowledge Base Check
* **Trigger Condition**: `if not chunks:`
* **Execution Behavior**:
  * Bypasses `PromptBuilder` context assembly.
  * Skips Gemini API call (`ai.generate_content`).
  * Emits warning log: `RAG Guardrail Triggered: No company chunks retrieved for query...`
* **API Payload Envelope**:
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

### Guardrail 2: Low-Similarity Threshold Check
* **Trigger Condition**: `max_similarity < settings.SIMILARITY_THRESHOLD` (`0.25`)
* **Execution Behavior**:
  * Evaluates maximum similarity across retrieved chunks:  
    $$\max_{c \in \text{chunks}} \left( \text{similarity}(c) \right) < \text{threshold}$$
  * Bypasses Gemini API call.
  * Emits warning log: `RAG Guardrail Triggered: Max similarity (0.000) below threshold (0.25)...`
* **API Payload Envelope**:
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

## 4. API Contract & Data Schema Compatibility

All schema updates maintain backward compatibility:
- **`ChatResponse` Model** (`app/models/response/ai.py`):  
  `answer: Optional[str] = Field(None, ...)` allows returning `answer: null` when guardrails trigger.
- **`ApiResponse` Envelope** (`app/models/response/base.py`):  
  Preserves `status`, `success`, `message`, and `data` envelope fields.
- **HTTP Status Code**: Standardized to `HTTP 200 OK` for predictable application-level handling.

---

## 5. Verification & Test Metrics Summary

A dedicated automated test suite (`tests/test_rag_guardrails.py`) was executed using `pytest`:
1. `test_empty_knowledge_base_rag_guardrail`: **PASSED**
2. `test_low_similarity_retrieval_rag_guardrail`: **PASSED**
3. `test_successful_retrieval_rag_chat`: **PASSED**
4. `test_unrelated_general_knowledge_question_blocked`: **PASSED**

**Overall Test Suite Status**: 74 out of 74 backend tests PASSED (100% pass rate).
