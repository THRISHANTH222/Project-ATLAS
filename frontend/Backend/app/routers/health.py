import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from app.config.settings import Settings, get_settings
from app.models.response.base import HealthCheckResponse, ServiceStatus
from app.services import get_ai_service, get_db_service, get_storage_service
from app.services.base import IAIService, IDatabaseService, IStorageService

router = APIRouter(prefix="/health", tags=["System Health"])


@router.get("", response_model=HealthCheckResponse)
async def check_health(
    settings: Settings = Depends(get_settings),
    db: IDatabaseService = Depends(get_db_service),
    storage: IStorageService = Depends(get_storage_service),
    ai: IAIService = Depends(get_ai_service),
) -> HealthCheckResponse:
    """
    Perform deep integration checks for sub-services (Firestore, GCS, Gemini)
    and output overall latency and service statuses.
    """
    services = {}
    overall_healthy = True

    # 1. Check Database (Firestore)
    db_start = time.perf_counter()
    try:
        # Simple fetch attempt
        await db.get_document("_health_", "check")
        db_latency = (time.perf_counter() - db_start) * 1000
        services["database"] = ServiceStatus(status="healthy", latency_ms=round(db_latency, 2))
    except Exception as e:
        overall_healthy = False
        services["database"] = ServiceStatus(status="degraded", details=str(e))

    # 2. Check Storage (Google Cloud Storage)
    storage_start = time.perf_counter()
    try:
        # Check by generating signed URL (lightweight local client check)
        await storage.generate_presigned_url("health_test.txt", expiration_seconds=60)
        storage_latency = (time.perf_counter() - storage_start) * 1000
        services["storage"] = ServiceStatus(status="healthy", latency_ms=round(storage_latency, 2))
    except Exception as e:
        services["storage"] = ServiceStatus(status="degraded", details=str(e))

    # 3. Check AI Service (Gemini API)
    ai_start = time.perf_counter()
    try:
        # Embedded check (or quick generation check if mock)
        await ai.embed_content("healthcheck")
        ai_latency = (time.perf_counter() - ai_start) * 1000
        services["ai_service"] = ServiceStatus(status="healthy", latency_ms=round(ai_latency, 2))
    except Exception as e:
        services["ai_service"] = ServiceStatus(status="degraded", details=str(e))

    return HealthCheckResponse(
        status="healthy" if overall_healthy else "degraded",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
        services=services,
    )
