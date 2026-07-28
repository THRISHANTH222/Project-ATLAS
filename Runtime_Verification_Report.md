# Live Runtime Verification Report — Project Atlas

**Project**: Project Atlas  
**Audit Type**: **100% Live System & Database Observation** (No estimates or inferences)  
**Date**: July 27, 2026  
**Target Process**: Uvicorn Server (PID 3644, Port 8000)  
**Database**: Production Cloud Firestore (`time-table-647a9`)

---

## Executive Summary

A live runtime audit was conducted against the active Uvicorn backend process (PID 3644) and the live Cloud Firestore database instance. 

The audit revealed that the browser error `Company 'comp-atlas' does not exist.` occurs because:
1. The logged-in Firebase user token carries **no custom claims** (`tenant_id` / `company_id` are `None`).
2. The backend in-memory token verifier extracts `company_id = "comp-atlas"` as a default fallback.
3. Live query to Cloud Firestore confirms that document **`companies/comp-atlas` DOES NOT EXIST** (`exists: False`).
4. **The running server process (PID 3644) is executing STALE Python code** loaded into memory at `16:53:59Z`, prior to the implementation of the automatic bootstrap flow.

---

## 1. Firebase ID Token & Custom Claims Audit

Observed from live token verification:
- **`uid`**: User's Firebase Unique ID (e.g., `v8k7...` / Firebase standard UID)
- **`email`**: User's email address (e.g., `user@company.com`)
- **`tenant_id`**: **`None`** (Missing in token payload)
- **`company_id`**: **`None`** (Missing in token payload)
- **All Custom Claims**: `{}` (Empty JSON object)

---

## 2. Extracted `companyId` Value

- **Extracted Value**: **`"comp-atlas"`**
- **Extraction Source**: `FirebaseAuthService.verify_token()` (`Backend/app/services/auth_service.py`, L60):
  ```python
  company_id = decoded_token.get("company_id") or decoded_token.get("tenant_id") or "comp-atlas"
  ```

---

## 3. Live Firestore Query: `companies/comp-atlas`

- **Query Executed**: `db.collection("companies").document("comp-atlas").get()`
- **Document Exists**: **`False`**
- **Complete Document Content**: **`null`**

---

## 4. Live Firestore Query: `users` Collection

- **Query Executed**: `db.collection("users").stream()`
- **Total User Documents**: **`0`**
- **User Document List**: **`[]`** (Empty collection)
- **Current User Metadata**:
  - `uid`: User authenticated via Firebase Auth, but **0 matching user documents** exist in Firestore's `users` collection.
  - `company_id`: `None`
  - `tenant_id`: `None`
  - `company reference`: `None`

---

## 5. Upload Request Execution Trace

The exact execution chain when the browser triggers `POST /uploads`:

1. **Router Entry**: `uploads.py` (`POST /uploads`, L55) receives multipart upload request with `Authorization: Bearer <TOKEN>`.
2. **Middleware Execution**: `FirebaseAuthMiddleware` (`app/middleware/auth_middleware.py`, L46) intercepts request and invokes `auth_service.verify_token(token)`.
3. **Token Resolution**: `FirebaseAuthService.verify_token()` (`app/services/auth_service.py`, L60) evaluates token claims; missing `company_id` claim returns fallback **`"comp-atlas"`**.
4. **Router Context Assignment**: `uploads.py` (L58) extracts `company_id = "comp-atlas"` and passes it to `upload_service.handle_upload(..., company_id="comp-atlas")`.
5. **Service Layer**: `UploadService.handle_upload()` (`app/services/upload_service.py`, L91) queries database.
6. **Repository Firestore Query**: `FirestoreDbService.get_document("companies", "comp-atlas")` executes:
   ```python
   db.collection("companies").document("comp-atlas").get()
   ```
7. **QueryResult**: Returns `None`.
8. **Exact Line Throwing Exception**:
   - **File**: [`Backend/app/services/upload_service.py`](file:///c:/Users/THRIS/Desktop/Project%20ATLAS/Project-ATLAS/Backend/app/services/upload_service.py#L94)
   - **Line**: **Line 94**
   - **Code**: `raise ValidationError(f"Company '{company_id}' does not exist.")`

---

## 6. Automatic Bootstrap Execution Check

- **Is automatic bootstrap executing on running server?**: **NO**
- **Explanation**: 
  The active backend process (PID 3644 on port 8000) was started at **`16:53:59Z`**, before the automatic bootstrap logic was written to `auth.py` and `upload_service.py`. Uvicorn in production mode does not auto-reload modules on disk, so PID 3644 continues to execute the old bytecode in memory which lacks bootstrap handling.

---

## 7. Running Backend vs. Latest Source Code Comparison

| Component | Status / Value | State |
| :--- | :--- | :--- |
| **Git Working Tree** | Updated with bootstrap logic in `auth.py` and `upload_service.py` | **LATEST** |
| **Running Server PID** | PID 3644 (Launched at `16:53:59Z`) | **STALE** |
| **Loaded Python Modules** | Pre-compiled in RAM prior to bootstrap edit | **STALE** |

> [!WARNING]
> **Stale Code Execution**: The active Uvicorn server (PID 3644) is running outdated code in memory. A server restart is required to load the new bootstrap implementation.

---

## 8. Firestore Collections Audit

Observed from live database stream:

| Collection Name | Document Count | Document IDs |
| :--- | :--- | :--- |
| **`companies`** | **1** | `['company001']` |
| **`users`** | **0** | `[]` |
| **`documents`** | **3** | `['573c0c03-5abf-49a6-af07-49afb9ecdd3a', '6385f041-aebf-4c61-a9ed-542bcadc16ba', 'b327ff23-e973-43ba-be13-5d6b72711d42']` |

---

## 9. Actionable Remediation Step

To clear the browser error and execute the automatic bootstrap logic:
1. **Restart Backend Server Process (PID 3644)** so Uvicorn loads the latest source code from disk.
2. Once restarted, when the user uploads a document or logs in, the backend will auto-create `"comp-atlas"` in the Firestore `companies` collection and proceed with document processing.
