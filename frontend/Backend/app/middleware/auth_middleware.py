from typing import Any, Dict, Optional
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.config.settings import get_settings
from app.middleware.error_handler import create_problem_details
from app.services import get_auth_service
from app.services.base import IAuthService
from app.utils.exceptions import AuthenticationError

# Standard OAuth2 Bearer scheme for Swagger UI integration
security = HTTPBearer(auto_error=False)


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts all requests, extracts the Bearer token,
    verifies it using Firebase Authentication, and injects user claims
    into the request.state context.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Default state user to None
        request.state.user = None

        auth_header = request.headers.get("Authorization")
        if auth_header:
            if not auth_header.startswith("Bearer "):
                return create_problem_details(
                    status_code=401,
                    title="Unauthorized",
                    detail="Authorization header must start with 'Bearer ' prefix.",
                    error_code="AUTHENTICATION_FAILED",
                    instance=request.url.path,
                )

            token = auth_header.split(" ", 1)[1]
            try:
                # Lazy-resolve auth service
                settings = get_settings()
                auth_service = get_auth_service(settings)

                # Verify token status
                user_claims = await auth_service.verify_token(token)
                request.state.user = user_claims
            except AuthenticationError as ae:
                return create_problem_details(
                    status_code=ae.status_code,
                    title=ae.title,
                    detail=ae.detail,
                    error_code=ae.error_code,
                    instance=request.url.path,
                    extra=ae.extra,
                )
            except Exception as e:
                return create_problem_details(
                    status_code=401,
                    title="Unauthorized",
                    detail=f"Token verification failed: {str(e)}",
                    error_code="AUTHENTICATION_FAILED",
                    instance=request.url.path,
                )

        return await call_next(request)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: IAuthService = Depends(get_auth_service),
) -> Dict[str, Any]:
    """
    Reusable FastAPI dependency that extracts user details.
    Uses cached state user from FirebaseAuthMiddleware if present.
    Falls back to direct token extraction and validation if middleware is absent.
    """
    # 1. Try middleware context state
    user = getattr(request.state, "user", None)
    if user:
        return user

    # 2. Fallback to direct validation
    if not credentials:
        raise AuthenticationError("Missing Authorization Header or credentials.")

    token = credentials.credentials
    user_claims = await auth_service.verify_token(token)
    return user_claims
