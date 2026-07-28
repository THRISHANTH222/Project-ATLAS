from typing import Any, Dict, Optional


class AppException(Exception):
    """Base exception for all application-specific errors."""

    def __init__(
        self,
        status_code: int = 500,
        title: str = "Internal Server Error",
        detail: Optional[str] = None,
        error_code: str = "INTERNAL_ERROR",
        extra: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(detail or title)
        self.status_code = status_code
        self.title = title
        self.detail = detail or title
        self.error_code = error_code
        self.extra = extra or {}


class AuthenticationError(AppException):
    """Raised when authentication fails (token invalid, missing, etc.)."""

    def __init__(self, detail: str = "Authentication failed", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=401,
            title="Unauthorized",
            detail=detail,
            error_code="AUTHENTICATION_FAILED",
            extra=extra,
        )


class AuthorizationError(AppException):
    """Raised when the user is authenticated but not authorized to perform the action."""

    def __init__(self, detail: str = "Permission denied", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=403,
            title="Forbidden",
            detail=detail,
            error_code="PERMISSION_DENIED",
            extra=extra,
        )


class NotFoundError(AppException):
    """Raised when a requested resource is not found."""

    def __init__(self, detail: str = "Resource not found", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=404,
            title="Not Found",
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
            extra=extra,
        )


class ConflictError(AppException):
    """Raised when a resource state conflict occurs (e.g. duplicate key)."""

    def __init__(self, detail: str = "Resource conflict occurred", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=409,
            title="Conflict",
            detail=detail,
            error_code="RESOURCE_CONFLICT",
            extra=extra,
        )


class ValidationError(AppException):
    """Raised when request arguments or data fail validation constraints."""

    def __init__(self, detail: str = "Validation failed", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=400,
            title="Bad Request",
            detail=detail,
            error_code="BAD_REQUEST",
            extra=extra,
        )


class DatabaseError(AppException):
    """Raised when a database operation (e.g. Firestore) fails."""

    def __init__(self, detail: str = "Database operation failed", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=500,
            title="Database Error",
            detail=detail,
            error_code="DATABASE_ERROR",
            extra=extra,
        )


class StorageError(AppException):
    """Raised when a cloud storage operation fails."""

    def __init__(self, detail: str = "Storage operation failed", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=500,
            title="Storage Error",
            detail=detail,
            error_code="STORAGE_ERROR",
            extra=extra,
        )


class AIServiceError(AppException):
    """Raised when an AI service (e.g. Groq) operation fails."""

    def __init__(self, detail: str = "AI service request failed", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=500,
            title="AI Service Error",
            detail=detail,
            error_code="AI_SERVICE_ERROR",
            extra=extra,
        )
