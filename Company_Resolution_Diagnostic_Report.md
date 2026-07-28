# Company Resolution Diagnostic Report — Project Atlas

**Issue**: `ValidationError: Company 'comp-atlas' does not exist.`  
**Trigger Action**: Document Upload (`POST /uploads`)  
**Investigation Mode**: **100% Read-Only Root Cause Analysis** (Zero code modified)  
**Date**: July 27, 2026

---

## Executive Diagnostic Summary

The upload error `Company 'comp-atlas' does not exist.` occurs because when a user authenticates via Firebase Authentication without explicit custom claims set on their account, the backend authentication service (`FirebaseAuthService.verify_token`) applies a hardcoded fallback string **`"comp-atlas"`** as the user's `company_id` / `tenant_id`. 

When the user attempts to upload a document via `POST /uploads`, `UploadService.handle_upload()` performs a Firestore document lookup in the `"companies"` collection for ID `"comp-atlas"`. Because no company registration or system bootstrap process ever created a company record with ID `"comp-atlas"` in Firestore, the lookup returns `None`, causing line 94 of `Backend/app/services/upload_service.py` to raise `ValidationError("Company 'comp-atlas' does not exist.")`.

---

## 1. Audit Findings & Answers to Specific Verification Requirements

### Requirement 1: Firebase ID Token Claims Audit
- **`uid`**: User's Firebase Unique Identifier (e.g. `usr-987654` or Firebase generated UID).
- **`email`**: User's active email address (e.g. `user@company.com`).
- **`companyId`**: **`None`** (Missing in token claims).
- **`tenant_id`**: **`None`** (Missing in token claims).
- **Custom Claims**: `{}` (Empty dictionary).

---

### Requirement 2: Backend `companyId` Extraction Pipeline
1. `FirebaseAuthMiddleware` (`Backend/app/middleware/auth_middleware.py`, L46) intercepts request `Authorization: Bearer <ID_TOKEN>` and calls `auth_service.verify_token(token)`.
2. `FirebaseAuthService.verify_token()` (`Backend/app/services/auth_service.py`, L57-71) decodes token via `auth.verify_id_token(token)`.
3. In `auth_service.py` (L60), the tenant is extracted using:
   ```python
   company_id = decoded_token.get("company_id") or decoded_token.get("tenant_id") or "comp-atlas"
   ```
4. Since `decoded_token` lacks `company_id` and `tenant_id`, `company_id` falls back to **`"comp-atlas"`**.
5. Claims dictionary with `company_id: "comp-atlas"`, `companyId: "comp-atlas"`, `tenant_id: "comp-atlas"` is set on `request.state.user`.
6. `POST /uploads` handler (`Backend/app/routers/uploads.py`, L58) extracts:
   ```python
   company_id = current_user.get("tenant_id") or current_user.get("company_id") # Evaluates to "comp-atlas"
   ```
7. Passed into `upload_service.handle_upload(..., company_id="comp-atlas")`.

---

### Requirement 3: Database Engine for Company Lookup
- **Database Engine**: **Cloud Firestore** (`FirestoreDbService` implementing `IDatabaseService`).
- **Target Collection**: `"companies"`
- **Target Document Key**: `"comp-atlas"`

---

### Requirement 4: Company Record Existence Check
- **Status**: **DOES NOT EXIST** (`FALSE`).
- Executing `await self.db.get_document("companies", "comp-atlas")` returns `None` because no Firestore document with key `"comp-atlas"` exists in the `"companies"` collection.

---

### Requirement 5: Creation & Bootstrap History
- **Why it was never created**: 
  1. Frontend signup (`signupWithEmail` in `frontend/src/lib/firebase.ts`) creates the user in Firebase Auth without calling a backend endpoint to create a company profile or assign custom claims.
  2. The hardcoded fallback string `"comp-atlas"` in `auth_service.py` was introduced as a default placeholder for development, but no database seed script, startup hook, or bootstrap process ever created `"comp-atlas"` in Firestore.
- **Process that should create it**:
  - Either the **User Registration / Tenant Onboarding Flow** (`POST /company` or `POST /auth/register`) should create a company record in Firestore and assign custom claim `tenant_id` to the Firebase user, OR the **Backend Application Lifespan Bootstrap** should seed `"comp-atlas"` if fallback tokens are permitted.

---

### Requirement 6: Users Collection References
- Standard Firebase Auth users created directly via client SDK carry no `tenant_id` claim. When they query protected endpoints, they are assigned default tenant ID `"comp-atlas"`, which references a non-existent company record in Firestore.

---

### Requirement 7: Firebase vs Database Company ID Match
- **Firebase Token Claim**: `None` (Evaluates in code to `"comp-atlas"`).
- **Firestore Database Record**: No `"comp-atlas"` document in `"companies"` collection.
- **Match Status**: **MISMATCH / ORPHAN REFERENCE**.

---

### Requirement 8: Exact Lookup Query Executed by Backend
- **File**: `Backend/app/services/upload_service.py` (L91)
- **Method Call**:
  ```python
  company_exists = await self.db.get_document("companies", company_id)
  ```
- **Underlying Firestore SDK Call** (`Backend/app/services/db_service.py`, L38):
  ```python
  db.collection("companies").document("comp-atlas").get()
  ```

---

### Requirement 9: Exact File & Line of Exception
- **File Path**: `Backend/app/services/upload_service.py`
- **Line Number**: **Line 94**
- **Exact Code**:
  ```python
  91: company_exists = await self.db.get_document("companies", company_id)
  92: if not company_exists:
  93:     logger.warning(f"Upload rejected: company '{company_id}' does not exist.")
  94:     raise ValidationError(f"Company '{company_id}' does not exist.")
  ```

---

## 10. Company Resolution Diagnostic Matrix

| Diagnostic Category | Value / Result |
| :--- | :--- |
| **Authenticated User** | Standard Firebase User (e.g. `usr-987654`) |
| **Firebase Claims** | `{}` (Missing `tenant_id` & `company_id`) |
| **Fallback Company ID** | `"comp-atlas"` (Hardcoded fallback in `auth_service.py:L60`) |
| **Database Lookup Executed** | `db.collection("companies").document("comp-atlas").get()` |
| **Company Record Existence** | **NOT FOUND** (`None` returned from Firestore) |
| **User Record Existence** | User exists in Firebase Auth, but lacks tenant claims |
| **Root Cause** | Token lacks custom claims (`tenant_id`), code falls back to `"comp-atlas"`, but no company with ID `"comp-atlas"` exists in Firestore `"companies"` collection. |

---

## Required Fix Options (For Future Implementation)

1. **Option A (System Bootstrap / Automatic Default Creation)**:
   In `app/main.py` lifespan startup or `upload_service.py` fallback check, if `company_id == "comp-atlas"` and does not exist in Firestore, auto-create the default company record:
   ```python
   {"id": "comp-atlas", "name": "Project Atlas Default Corporation", "is_active": True}
   ```
2. **Option B (Tenant Signup & Custom Claims Assignment)**:
   Update user signup flow (`POST /auth/register` or `POST /company`) to create a company document in Firestore and set custom claims on the user via Firebase Admin SDK:
   ```python
   auth.set_custom_user_claims(uid, {"tenant_id": company_id, "company_id": company_id})
   ```

---

*Report prepared strictly in Read-Only Investigation Mode by Antigravity AI Assistant.*
