from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import get_current_user
from app.models.request.auth import CreateUserRequest, VerifyTokenRequest
from app.models.response.auth import TokenVerificationResponse
from app.models.response.base import ApiResponse
from app.services import get_auth_service
from app.services.base import IAuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/verify", response_model=ApiResponse[TokenVerificationResponse])
async def verify_user_token(
    payload: VerifyTokenRequest,
    auth_service: IAuthService = Depends(get_auth_service),
) -> ApiResponse[TokenVerificationResponse]:
    """
    Verifies a Firebase ID token. Returns user info and custom claims.
    Useful for login validation checks from client apps.
    """
    claims = await auth_service.verify_token(payload.token)
    
    # Enrich details
    data = TokenVerificationResponse(
        uid=claims.get("uid", ""),
        email=claims.get("email", ""),
        display_name=claims.get("name", claims.get("email", "").split("@")[0]),
        claims=claims,
    )
    return ApiResponse(status="success", message="Token verified successfully", data=data)


@router.post("/register", response_model=ApiResponse[TokenVerificationResponse])
async def register_user(
    payload: CreateUserRequest,
    auth_service: IAuthService = Depends(get_auth_service),
) -> ApiResponse[TokenVerificationResponse]:
    """
    Creates a new user profile in Firebase Auth.
    """
    user_record = await auth_service.create_user(
        email=payload.email,
        display_name=payload.display_name,
    )
    
    # We mock or return structured token details
    data = TokenVerificationResponse(
        uid=user_record.get("uid", ""),
        email=user_record.get("email", ""),
        display_name=user_record.get("display_name", ""),
        claims={},
    )
    return ApiResponse(status="success", message="User profile registered successfully", data=data)


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
