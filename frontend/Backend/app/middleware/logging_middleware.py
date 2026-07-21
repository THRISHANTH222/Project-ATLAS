import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.utils.logger import get_logger

logger = get_logger("app.middleware.logging")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs incoming HTTP requests and outgoing HTTP responses
    along with their durations and status codes.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()
        client_host = request.client.host if request.client else "unknown"

        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "http_method": request.method,
                "http_path": request.url.path,
                "client_ip": client_host,
                "query_params": dict(request.query_params),
            },
        )

        try:
            response = await call_next(request)
            process_time = time.perf_counter() - start_time
            logger.info(
                f"Request completed: {request.method} {request.url.path} - "
                f"Status: {response.status_code} - Duration: {process_time:.4f}s",
                extra={
                    "http_method": request.method,
                    "http_path": request.url.path,
                    "client_ip": client_host,
                    "status_code": response.status_code,
                    "duration_seconds": round(process_time, 4),
                },
            )
            return response
        except Exception as e:
            process_time = time.perf_counter() - start_time
            logger.exception(
                f"Request failed: {request.method} {request.url.path} - "
                f"Error: {str(e)} - Duration: {process_time:.4f}s",
                extra={
                    "http_method": request.method,
                    "http_path": request.url.path,
                    "client_ip": client_host,
                    "duration_seconds": round(process_time, 4),
                },
            )
            raise e
