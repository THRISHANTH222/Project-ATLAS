import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.utils.logger import correlation_id_ctx


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that ensures every request has a Correlation ID,
    which is propagated in logs and returned in response headers.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check if Correlation ID already exists in request headers, otherwise generate one
        correlation_id = request.headers.get("X-Correlation-ID") or request.headers.get("X-Request-ID")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        # Set the correlation ID in context for logging
        token = correlation_id_ctx.set(correlation_id)

        try:
            response = await call_next(request)
        finally:
            # Reset context variable after request is processed
            correlation_id_ctx.reset(token)

        # Set Correlation ID header on response
        response.headers["X-Correlation-ID"] = correlation_id
        return response
