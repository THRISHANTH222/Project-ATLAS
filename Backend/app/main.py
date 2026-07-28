from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.middleware.auth_middleware import FirebaseAuthMiddleware
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.error_handler import register_error_handlers
from app.middleware.logging_middleware import LoggingMiddleware
from app.routers import ai, auth, company, health, storage, uploads, documents, retrieval
from app.utils.logger import get_logger, setup_logging

from app.utils.firebase import initialize_firebase

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
    # Initialize Firebase Admin SDK eagerly at startup to resolve initialization order dependencies
    initialize_firebase(settings)
    
    # Eagerly validate Supabase Storage connectivity on startup
    try:
        from app.services import get_storage_service
        storage_service = get_storage_service(settings)
        await storage_service.validate_connectivity()
    except Exception as e:
        logger.error(f"Failed to validate Supabase Storage connectivity on startup: {e}")
        if settings.ENVIRONMENT.lower() not in ("development", "testing") or settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(f"Startup validation failed: Supabase Storage is not accessible: {e}")
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
            "Modular architecture built with clean abstractions, Firebase, GCS, and Groq."
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
    allowed_origins = [origin for origin in settings.CORS_ORIGINS if origin != "*"]
    if settings.ENVIRONMENT.lower() == "production" and "*" in settings.CORS_ORIGINS:
        logger.warning("Wildcard origin '*' detected in CORS_ORIGINS in production mode. Restricting wildcard access.")
        
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Correlation-ID", "Accept", "Origin"],
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
    app.include_router(uploads.router)
    app.include_router(documents.router)
    app.include_router(retrieval.router)

    return app


app = create_app()
