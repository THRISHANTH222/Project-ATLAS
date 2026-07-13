from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class Company(BaseModel):
    """Core Domain Model representing an Enterprise SaaS Tenant (Company)."""

    id: str = Field(..., description="Unique Company/Tenant Identifier")
    name: str = Field(..., max_length=255, description="Legal or trade name of the company")
    domain: Optional[str] = Field(None, description="Primary corporate web domain (e.g. company.com)")
    logo_url: Optional[str] = Field(None, description="URL path to uploaded GCS logo asset")
    is_active: bool = Field(default=True, description="Active subscription or operational status")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last update timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "comp-123456",
                "name": "Acme Corporation",
                "domain": "acme.com",
                "logo_url": "https://storage.googleapis.com/project-atlas/logos/acme.png",
                "is_active": True,
                "created_at": "2026-07-12T23:32:07",
                "updated_at": "2026-07-12T23:32:07",
            }
        }
    )
