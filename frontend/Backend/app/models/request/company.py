from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CompanyCreateRequest(BaseModel):
    """Payload to register a new company tenant."""

    name: str = Field(..., min_length=2, max_length=255, description="Name of the company")
    domain: Optional[str] = Field(None, max_length=255, description="Corporate email domain or website")
    logo_url: Optional[str] = Field(None, description="Logo image path or URL")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Acme Corporation",
                "domain": "acme.com",
                "logo_url": "https://storage.googleapis.com/project-atlas/logos/acme.png"
            }
        }
    )


class CompanyUpdateRequest(BaseModel):
    """Payload to modify an existing company tenant details."""

    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Updated name of the company")
    domain: Optional[str] = Field(None, max_length=255, description="Updated email domain or website")
    logo_url: Optional[str] = Field(None, description="Updated logo image path or URL")
    is_active: Optional[bool] = Field(None, description="Update operational status flag")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Acme Industries",
                "is_active": True
            }
        }
    )
