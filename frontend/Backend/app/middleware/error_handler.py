from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.exceptions import AppException
from app.utils.logger import correlation_id_ctx, get_logger

logger = get_logger("app.middleware.error_handler")


def create_problem_details(
    status_code: int,
    title: str,
    detail: str,
    error_code: str,
    instance: str,
    invalid_params: Optional[List[Dict[str, Any]]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    """Formats standard RFC 7807 problem details response."""
    content: Dict[str, Any] = {
        "type": "about:blank",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": instance,
        "error_code": error_code,
        "correlation_id": correlation_id_ctx.get("-"),
    }

    if invalid_params is not None:
        content["invalid_params"] = invalid_params
    if extra is not None:
        content["extra"] = extra

    return JSONResponse(
        status_code=status_code,
        content=content,
        headers={"Content-Type": "application/problem+json"},
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handles custom domain-specific application exceptions."""
    logger.warning(
        f"Domain exception: {exc.title} - {exc.detail} [TraceID: {correlation_id_ctx.get('-')}]",
        extra={"error_code": exc.error_code, "extra_info": exc.extra},
    )
    return create_problem_details(
        status_code=exc.status_code,
        title=exc.title,
        detail=exc.detail,
        error_code=exc.error_code,
        instance=request.url.path,
        extra=exc.extra,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handles Pydantic validation errors."""
    invalid_params = []
    for error in exc.errors():
        # Clean up field location path (e.g. body -> user -> email)
        loc = error.get("loc", [])
        loc_str = ".".join(str(x) for x in loc[1:]) if len(loc) > 1 else ".".join(str(x) for x in loc)
        invalid_params.append(
            {
                "name": loc_str or "request_body",
                "reason": error.get("msg", "Invalid value"),
            }
        )

    logger.warning(
        f"Validation exception on path {request.url.path} [TraceID: {correlation_id_ctx.get('-')}]",
        extra={"invalid_params": invalid_params},
    )

    return create_problem_details(
        status_code=422,
        title= "Unprocessable Entity",
        detail="The request body or parameters failed validation requirements.",
        error_code="VALIDATION_FAILED",
        instance=request.url.path,
        invalid_params=invalid_params,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handles standard Starlette/FastAPI HTTPExceptions."""
    logger.info(
        f"HTTP exception: Status {exc.status_code} - {exc.detail} [TraceID: {correlation_id_ctx.get('-')}]"
    )
    return create_problem_details(
        status_code=exc.status_code,
        title="HTTP Error",
        detail=exc.detail,
        error_code=f"HTTP_{exc.status_code}",
        instance=request.url.path,
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled internal exceptions."""
    logger.exception(
        f"Unhandled system exception: {str(exc)} [TraceID: {correlation_id_ctx.get('-')}]"
    )
    return create_problem_details(
        status_code=500,
        title="Internal Server Error",
        detail="An unexpected error occurred on the server. Please contact support.",
        error_code="INTERNAL_SERVER_ERROR",
        instance=request.url.path,
    )


def register_error_handlers(app: FastAPI) -> None:
    """Registers all exception handlers onto the FastAPI application."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)
