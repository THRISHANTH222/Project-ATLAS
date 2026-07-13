from typing import Any, Dict, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standardized Top-Level API Envelope Model."""

    status: str = Field(default="success", description="Status string (e.g. success, error)")
    message: Optional[str] = Field(None, description="Detailed action summary message")
    data: Optional[T] = Field(None, description="Generic response payload envelope")


class ServiceStatus(BaseModel):
    """Sub-service status inside health check response."""

    status: str = Field(..., description="Service status: healthy or degraded")
    latency_ms: Optional[float] = Field(None, description="Optional measurement of service call latency")
    details: Optional[str] = Field(None, description="Additional context info")


class HealthCheckResponse(BaseModel):
    """Detailed health check response representing the systems integrity."""

    status: str = Field(..., description="Overall backend application status")
    version: str = Field(..., description="Application version release")
    environment: str = Field(..., description="Target execution runtime environment")
    timestamp: str = Field(..., description="Server current ISO-datetime")
    services: Dict[str, ServiceStatus] = Field(..., description="Dictionary containing dependency check statuses")
