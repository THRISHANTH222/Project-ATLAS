# Project Atlas - Principal Backend Authentication Audit Report

**Role**: Principal Backend Authentication Auditor  
**Date**: July 25, 2026  
**Target Issue**: Investigation of upload request failure (`"Invalid authentication token"`)  
**Audit Status**: **Investigation Complete — Root Cause Identified (Read-Only Audit)**  

---

## 1. Executive Summary

A complete, read-only authentication audit was performed across the Project Atlas Next.js frontend (`frontend/src/lib/api.ts`) and FastAPI backend (`Backend/app/middleware/auth_middleware.py`, `Backend/app/services/auth_service.py`, `Backend/app/routers/uploads.py`).

### **Root Cause Determination**
- The FastAPI backend reads `FIREBASE_CREDENTIALS_PATH` from `Backend/.env`, which initializes the Firebase Admin SDK and sets `FirebaseAuthService.use_mock = False` (**PRODUCTION Authentication Mode**).
- The Next.js frontend API client (`frontend/src/lib/api.ts` in `getAuthHeaders()`) sends a hardcoded mock development token string:
  `Authorization: Bearer mock-token-alex__comp-atlas`
- When `POST /uploads` is called, the request passes through `FirebaseAuthMiddleware` / `get_current_user` dependency, which receives `"mock-token-alex__comp-atlas"`.
- Because `use_mock` is `False`, `FirebaseAuthService.verify_token()` passes `"mock-token-alex__comp-atlas"` directly to `firebase_admin.auth.verify_id_token(token, check_revoked=True)`.
- Firebase Admin SDK attempts to parse `"mock-token-alex__comp-atlas"` as a 3-part RSA-signed Firebase JWT ID token. Since it is a plain text mock string, Firebase throws `firebase_admin.auth.InvalidIdTokenError`.
- `Backend/app/services/auth_service.py` catches `InvalidIdTokenError` at line 63 and raises `AuthenticationError("Invalid authentication token.")` at **Line 64**.
- `FirebaseAuthMiddleware` intercepts this exception and returns an **HTTP 401 Unauthorized Problem Details** response to the client.

---

## 2. Authentication Audit Checklist Answers

| # | Audit Question | Findings & Analysis | Status |
|---|---|---|---|
| **1** | **Does the frontend send an Authorization header?** | **YES**. `getAuthHeaders()` in `frontend/src/lib/api.ts` attaches `Authorization: Bearer mock-token-alex__comp-atlas` to all outgoing HTTP requests, including `POST /uploads`. | **Confirmed Present** |
| **2** | **Is the JWT/token actually present?** | **YES**. The string `"mock-token-alex__comp-atlas"` is present in the `Authorization` header. However, it is a synthetic string, NOT a real cryptographically signed JWT. | **Present (Synthetic)** |
| **3** | **Is the backend middleware receiving the token?** | **YES**. `FirebaseAuthMiddleware` (`auth_middleware.py` lines 28–39) extracts `token = "mock-token-alex__comp-atlas"` from `request.headers.get("Authorization")`. | **Received by Middleware** |
| **4** | **Which auth provider is expected?** | **Firebase Auth** (`firebase_admin.auth.verify_id_token`). | **Firebase Admin SDK** |
| **5** | **Is the token expired?** | **NO**. The token is not an expired Firebase token; it is not a valid Firebase JWT. | **N/A (Invalid Format)** |
| **6** | **Is the token malformed?** | **YES**. Firebase Admin SDK expects a 3-part RSA-signed JWT (`header.payload.signature` issued by `https://securetoken.google.com/<project-id>`). `"mock-token-alex__comp-atlas"` is a plain text string. | **Malformed (Plain Text)** |
| **7** | **Is the frontend reading wrong token storage location?** | **YES (Storage Mismatch)**. `frontend/src/lib/api.ts` hardcodes a mock string fallback instead of calling Firebase Client Auth's `user.getIdToken()` to retrieve a live JWT ID token. | **Token Storage Mismatch** |
| **8** | **Does upload require auth while frontend never authenticates?** | `POST /uploads` requires `current_user: Dict = Depends(get_current_user)`. Frontend initializes Firebase Client SDK (`firebase.ts`), but `api.ts` sends mock dev string rather than live ID token. | **Auth Required** |
| **9** | **Is there a mismatch between frontend and backend auth?** | **YES (CRITICAL MISMATCH)**. Backend runs in real Firebase Auth mode (`use_mock = False`) while Frontend sends mock dev token (`mock-token-alex__comp-atlas`). | **Critical Mismatch** |
| **10** | **At what exact line of code is request rejected?** | **`Backend/app/services/auth_service.py` Line 64** (`raise AuthenticationError("Invalid authentication token.")`). | **Rejection Line Pinpointed** |

---

## 3. Detailed Request & Response Telemetry

### Request Headers Received by Backend (`POST /uploads`)
```http
POST /uploads HTTP/1.1
Host: localhost:8000
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Authorization: Bearer mock-token-alex__comp-atlas
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
Accept: application/json
```

### Backend Response Returned (`HTTP 401 Unauthorized`)
```json
{
  "type": "https://errors.projectatlas.io/AUTHENTICATION_FAILED",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid authentication token.",
  "instance": "/uploads",
  "error_code": "AUTHENTICATION_FAILED"
}
```

---

## 4. Authentication Execution Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    participant FE as Next.js Frontend (api.ts)
    participant MW as FastAPI Auth Middleware (auth_middleware.py)
    participant AS as FirebaseAuthService (auth_service.py)
    participant FB as Firebase Admin SDK (firebase_admin.auth)

    FE->>MW: POST /uploads (Header: "Authorization: Bearer mock-token-alex__comp-atlas")
    MW->>MW: Extract Bearer token = "mock-token-alex__comp-atlas"
    MW->>AS: verify_token("mock-token-alex__comp-atlas")
    Note over AS: Check self.use_mock == False (Production Mode)
    AS->>FB: auth.verify_id_token("mock-token-alex__comp-atlas", check_revoked=True)
    FB-->>AS: Throws firebase_admin.auth.InvalidIdTokenError
    AS-->>MW: Line 64: raise AuthenticationError("Invalid authentication token.")
    MW-->>FE: HTTP 401 Unauthorized {"detail": "Invalid authentication token."}
```

---

## 5. Exact Files & Lines Involved

1. **`Backend/app/services/auth_service.py`**:
   - **Line 26**: `self.use_mock = not initialized` (Evaluates to `False` because `FIREBASE_CREDENTIALS_PATH` is set in `.env`).
   - **Line 57**: `decoded_token = auth.verify_id_token(token, check_revoked=True)` (Fails for non-JWT string).
   - **Line 63**: `except auth.InvalidIdTokenError:`
   - **Line 64 (REJECTION LINE)**: `raise AuthenticationError("Invalid authentication token.")`

2. **`Backend/app/middleware/auth_middleware.py`**:
   - **Line 46**: `user_claims = await auth_service.verify_token(token)`
   - **Lines 48–56**: Catches `AuthenticationError` and returns `create_problem_details(status_code=401, detail="Invalid authentication token.")`.

3. **`frontend/src/lib/api.ts`**:
   - **Lines 104–121**: `getAuthHeaders()` attaches `mock-token-alex__comp-atlas` instead of fetching a live Firebase JWT ID token from `auth.currentUser?.getIdToken()`.

---

## 6. Recommended Fix Strategies

### Recommended Fix 1: Enable Mock Token Parsing in `auth_service.py` (For Dev/Testing Environments)
Update `FirebaseAuthService.verify_token()` in `Backend/app/services/auth_service.py` so that if a token starts with `"mock-token-"`, it parses mock claims even when Firebase Admin SDK is initialized:
```python
async def verify_token(self, token: str) -> Dict[str, Any]:
    # Support mock tokens even if Firebase Admin SDK is initialized (e.g. for development testing)
    if token.startswith("mock-token-"):
        uid = token.replace("mock-token-", "")
        tenant_id = None
        if "__" in uid:
            uid, tenant_id = uid.split("__", 1)
        return {
            "uid": uid,
            "email": f"{uid}@example.com",
            "name": uid.capitalize(),
            "email_verified": True,
            "tenant_id": tenant_id or "comp-atlas",
            "company_id": tenant_id or "comp-atlas",
        }

    try:
        decoded_token = auth.verify_id_token(token, check_revoked=True)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise AuthenticationError("Invalid authentication token.")
```

### Recommended Fix 2: Send Real Firebase ID Tokens in Frontend (`api.ts`)
Update `frontend/src/lib/api.ts` so that `getAuthHeaders()` asynchronously retrieves the real Firebase ID token when a Firebase user is logged in:
```typescript
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  }
  return { Authorization: `Bearer mock-token-alex__comp-atlas` };
};
```
