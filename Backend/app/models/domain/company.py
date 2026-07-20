from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Company(BaseModel):
    """Core Domain Model representing an Enterprise SaaS Tenant (Company)."""

    id: str = Field(..., description="Unique Company/Tenant Identifier")
    name: str = Field(..., max_length=255, description="Legal or trade name of the company")
    domain: Optional[str] = Field(None, description="Primary corporate web domain (e.g. company.com)")
    logo_url: Optional[str] = Field(None, description="URL path to uploaded storage logo asset")
    is_active: bool = Field(default=True, description="Active subscription or operational status")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last update timestamp")

    # New properties to match TypeScript interface
    companyName: Optional[str] = Field(None, description="Name of the company")
    organizationType: Optional[str] = Field(None, description="Organization type")
    email: Optional[str] = Field(None, description="Corporate email address")
    phone: Optional[str] = Field(None, description="Corporate phone number")
    address: Optional[str] = Field(None, description="Company address")
    website: Optional[str] = Field(None, description="Company website URL")
    logo: Optional[str] = Field(None, description="Logo URL path")
    timezone: Optional[str] = Field(None, description="Corporate timezone")
    country: Optional[str] = Field(None, description="Country")
    state: Optional[str] = Field(None, description="State")
    city: Optional[str] = Field(None, description="City")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "comp-123456",
                "name": "Acme Corporation",
                "domain": "acme.com",
                "logo_url": "https://supabase-link/logo/acme.png",
                "is_active": True,
                "created_at": "2026-07-12T23:32:07",
                "updated_at": "2026-07-12T23:32:07",
            }
        }
    )

    @model_validator(mode="after")
    def align_domain_fields(self) -> "Company":
        # Synchronize new and legacy properties
        if self.name and not self.companyName:
            self.companyName = self.name
        if self.companyName and not self.name:
            self.name = self.companyName

        if self.domain and not self.website:
            self.website = f"https://{self.domain}" if not self.domain.startswith(("http://", "https://")) else self.domain
        if self.website and not self.domain:
            url = self.website.lower()
            for prefix in ("https://", "http://"):
                if url.startswith(prefix):
                    url = url[len(prefix):]
            if "/" in url:
                url = url.split("/", 1)[0]
            if ":" in url:
                url = url.split(":", 1)[0]
            self.domain = url

        if self.logo_url and not self.logo:
            self.logo = self.logo_url
        if self.logo and not self.logo_url:
            self.logo_url = self.logo

        return self
