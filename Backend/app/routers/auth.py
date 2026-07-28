from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import get_current_user
from app.models.request.auth import CreateUserRequest, VerifyTokenRequest
from app.models.response.auth import TokenVerificationResponse
from app.models.response.base import ApiResponse
from app.services import get_auth_service, get_db_service
from app.services.base import IAuthService, IDatabaseService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/verify", response_model=ApiResponse[TokenVerificationResponse])
async def verify_user_token(
    payload: VerifyTokenRequest,
    auth_service: IAuthService = Depends(get_auth_service),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[TokenVerificationResponse]:
    """
    Verifies a Firebase ID token. Returns user info and custom claims.
    Bootstraps missing Company and User records in Firestore if needed.
    """
    claims = await auth_service.verify_token(payload.token)
    uid = claims.get("uid", "")
    email = claims.get("email", "")
    company_id = claims.get("company_id") or claims.get("tenant_id") or "comp-atlas"

    # 1. Ensure Company Record in Firestore
    if not await db.get_document("companies", company_id):
        company_data = {
            "id": company_id,
            "name": "Project Atlas Default Corporation" if company_id == "comp-atlas" else f"Company {company_id}",
            "domain": email.split("@")[-1] if "@" in email else "atlas.internal",
            "is_active": True,
        }
        await db.create_document("companies", company_data, doc_id=company_id)

    # 2. Ensure User Record in Firestore Linked to Company
    if uid and not await db.get_document("users", uid):
        user_data = {
            "id": uid,
            "uid": uid,
            "email": email,
            "display_name": claims.get("name") or email.split("@")[0],
            "company_id": company_id,
            "companyId": company_id,
            "role": "user",
        }
        await db.create_document("users", user_data, doc_id=uid)
    
    # Enrich details
    data = TokenVerificationResponse(
        uid=uid,
        email=email,
        display_name=claims.get("name", email.split("@")[0] if email else "User"),
        claims=claims,
    )
    return ApiResponse(status="success", message="Token verified successfully", data=data)


@router.post("/register", response_model=ApiResponse[TokenVerificationResponse])
async def register_user(
    payload: CreateUserRequest,
    auth_service: IAuthService = Depends(get_auth_service),
    db: IDatabaseService = Depends(get_db_service),
) -> ApiResponse[TokenVerificationResponse]:
    """
    Creates a new user profile in Firebase Auth and bootstraps linked Company and User records.
    """
    user_record = await auth_service.create_user(
        email=payload.email,
        display_name=payload.display_name,
    )
    uid = user_record.get("uid", "")
    company_id = f"comp-{uid[:8]}" if uid else "comp-atlas"

    # 1. Create Company record in Firestore
    if not await db.get_document("companies", company_id):
        company_data = {
            "id": company_id,
            "name": f"{payload.display_name or 'User'}'s Organization",
            "domain": payload.email.split("@")[-1] if "@" in payload.email else "atlas.internal",
            "is_active": True,
        }
        await db.create_document("companies", company_data, doc_id=company_id)

    # 2. Create User record in Firestore linked to Company
    user_data = {
        "id": uid,
        "uid": uid,
        "email": payload.email,
        "display_name": payload.display_name,
        "company_id": company_id,
        "companyId": company_id,
        "role": "admin",
    }
    await db.create_document("users", user_data, doc_id=uid)
    
    claims = {"company_id": company_id, "companyId": company_id, "tenant_id": company_id}

    data = TokenVerificationResponse(
        uid=uid,
        email=payload.email,
        display_name=payload.display_name,
        claims=claims,
    )
    return ApiResponse(status="success", message="User profile and company registered successfully", data=data)


@router.get("/me", response_model=ApiResponse[TokenVerificationResponse])
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
) -> ApiResponse[TokenVerificationResponse]:
    """
    Returns user profile details extracted from active session JWT.
    Demonstrates routing protection using Bearer token verification.
    """
    data = TokenVerificationResponse(
        uid=current_user.get("uid", ""),
        email=current_user.get("email", ""),
        display_name=current_user.get("name", current_user.get("email", "").split("@")[0]),
        claims=current_user,
    )
    return ApiResponse(status="success", message="Profile details retrieved", data=data)
