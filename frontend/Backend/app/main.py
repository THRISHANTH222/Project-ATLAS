from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.middleware.auth_middleware import FirebaseAuthMiddleware
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.error_handler import register_error_handlers
from app.middleware.logging_middleware import LoggingMiddleware
from app.routers import ai, auth, company, health, storage
from app.utils.logger import get_logger, setup_logging

# Load configurations
settings = get_settings()

# Setup logging
setup_logging(log_level=settings.LOG_LEVEL, environment=settings.ENVIRONMENT)
logger = get_logger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown lifecycles."""
    logger.info(
        f"Starting {settings.APP_NAME} in environment: {settings.ENVIRONMENT}..."
    )
    # Perform pre-flight connection verifications, setup caching, warm-up LLM connections, etc.
    yield
    # Clear client sessions, close database connections
    logger.info(f"Shutting down {settings.APP_NAME}...")
    try:
        from app.services import get_db_service
        db_service = get_db_service(settings)
        await db_service.close_connection()
    except Exception as e:
        logger.error(f"Failed to cleanly close database during shutdown: {e}")


def create_app() -> FastAPI:
    """Configures and builds the FastAPI application instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "Enterprise SaaS FastAPI Backend for Project Atlas. "
            "Modular architecture built with clean abstractions, Firebase, GCS, and Gemini."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # 1. Register Middlewares
    # Starlette executes middleware in REVERSE order of registration.
    # The last added middleware is executed FIRST.
    # Therefore: CorrelationIdMiddleware -> LoggingMiddleware -> FirebaseAuthMiddleware -> CORSMiddleware
    app.add_middleware(FirebaseAuthMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(CorrelationIdMiddleware)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID"],
    )

    # 2. Register Global Exception Handlers (RFC 7807)
    register_error_handlers(app)

    # 3. Register Routers
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(company.router)
    app.include_router(storage.router)
    app.include_router(ai.router)

    return app


app = create_app()
