from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
import re


class CompanyCreateRequest(BaseModel):
    """Payload to register a new company tenant."""

    # Legacy fields (for backward compatibility)
    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Name of the company")
    domain: Optional[str] = Field(None, max_length=255, description="Corporate email domain or website")
    logo_url: Optional[str] = Field(None, description="Logo image path or URL")

    # New strongly typed fields matching TypeScript Zod schema
    companyName: Optional[str] = Field(None, max_length=100, description="Name of the company")
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
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "companyName": "Acme Corporation",
                "organizationType": "Corporation",
                "email": "info@acme.com",
                "phone": "+1234567890",
                "address": "123 Main St",
                "website": "https://acme.com",
                "timezone": "America/New_York",
                "country": "USA",
                "state": "NY",
                "city": "New York"
            }
        }
    )

    @model_validator(mode="after")
    def validate_and_align_fields(self) -> "CompanyCreateRequest":
        # 1. Apply Zod-aligned validations only if new fields are explicitly provided in the request
        # We determine this BEFORE modifying any attribute to prevent model_fields_set pollution.
        is_new_style = "companyName" in self.model_fields_set or any(
            f in self.model_fields_set for f in [
                "organizationType", "email", "phone", "address", 
                "website", "logo", "timezone", "country", "state", "city"
            ]
        )

        # 2. Map legacy inputs to new properties
        if self.name and not self.companyName:
            self.companyName = self.name
        if self.domain and not self.website:
            self.website = f"https://{self.domain}" if not self.domain.startswith(("http://", "https://")) else self.domain
        if self.logo_url and not self.logo:
            self.logo = self.logo_url

        # 3. Map new properties back to legacy properties for backwards-compatible DB storage
        if self.companyName and not self.name:
            self.name = self.companyName
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
        if self.logo and not self.logo_url:
            self.logo_url = self.logo

        if is_new_style:
            # Check required fields
            required = {
                "companyName": self.companyName,
                "organizationType": self.organizationType,
                "email": self.email,
                "phone": self.phone,
                "address": self.address,
                "website": self.website,
                "timezone": self.timezone,
                "country": self.country,
                "state": self.state,
                "city": self.city
            }
            for field_name, value in required.items():
                if not value or not str(value).strip():
                    raise ValueError(f"{field_name} is required and cannot be empty.")

            # Validate lengths and formats
            if len(self.companyName) < 1 or len(self.companyName) > 100:
                raise ValueError("Company name must be between 1 and 100 characters.")

            if self.email:
                email_regex = r"^[^@]+@[^@]+\.[^@]+$"
                if not re.match(email_regex, self.email):
                    raise ValueError("Invalid email address format.")

            if self.phone:
                if len(self.phone) < 5 or len(self.phone) > 20:
                    raise ValueError("Phone number must be between 5 and 20 characters.")
                if not re.match(r"^\+?[\d\s\-()]+$", self.phone):
                    raise ValueError("Invalid phone number format.")

            if self.website:
                if not self.website.startswith(("http://", "https://")):
                    raise ValueError("Invalid website URL format (must start with http:// or https://).")

            if self.logo and self.logo.strip():
                if not self.logo.startswith(("http://", "https://")):
                    raise ValueError("Invalid logo URL format.")

        return self


class CompanyUpdateRequest(BaseModel):
    """Payload to modify an existing company tenant details."""

    # Legacy fields
    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Updated name of the company")
    domain: Optional[str] = Field(None, max_length=255, description="Updated email domain or website")
    logo_url: Optional[str] = Field(None, description="Updated logo image path or URL")
    is_active: Optional[bool] = Field(None, description="Update operational status flag")

    # New fields matching TS Zod schema
    companyName: Optional[str] = Field(None, max_length=100, description="Updated name of the company")
    organizationType: Optional[str] = Field(None, description="Updated organization type")
    email: Optional[str] = Field(None, description="Updated corporate email address")
    phone: Optional[str] = Field(None, description="Updated phone number")
    address: Optional[str] = Field(None, description="Updated company address")
    website: Optional[str] = Field(None, description="Updated website URL")
    logo: Optional[str] = Field(None, description="Updated logo URL")
    timezone: Optional[str] = Field(None, description="Updated timezone")
    country: Optional[str] = Field(None, description="Updated country")
    state: Optional[str] = Field(None, description="Updated state")
    city: Optional[str] = Field(None, description="Updated city")

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "companyName": "Acme Industries",
                "is_active": True
            }
        }
    )

    @model_validator(mode="after")
    def validate_and_align_fields(self) -> "CompanyUpdateRequest":
        # Align legacy and new fields
        if self.name and not self.companyName:
            self.companyName = self.name
        if self.domain and not self.website:
            self.website = f"https://{self.domain}" if not self.domain.startswith(("http://", "https://")) else self.domain
        if self.logo_url and not self.logo:
            self.logo = self.logo_url

        if self.companyName and not self.name:
            self.name = self.companyName
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
        if self.logo and not self.logo_url:
            self.logo_url = self.logo

        # Validate fields only if they are supplied
        if self.companyName is not None:
            if len(self.companyName) < 1 or len(self.companyName) > 100:
                raise ValueError("Company name must be between 1 and 100 characters.")

        if self.organizationType is not None:
            if not self.organizationType.strip():
                raise ValueError("organizationType cannot be empty.")

        if self.email is not None:
            email_regex = r"^[^@]+@[^@]+\.[^@]+$"
            if not re.match(email_regex, self.email):
                raise ValueError("Invalid email address format.")

        if self.phone is not None:
            if len(self.phone) < 5 or len(self.phone) > 20:
                raise ValueError("Phone number must be between 5 and 20 characters.")
            if not re.match(r"^\+?[\d\s\-()]+$", self.phone):
                raise ValueError("Invalid phone number format.")

        if self.address is not None:
            if not self.address.strip():
                raise ValueError("address cannot be empty.")

        if self.website is not None:
            if not self.website.startswith(("http://", "https://")):
                raise ValueError("Invalid website URL format (must start with http:// or https://).")

        if self.logo is not None and self.logo.strip():
            if not self.logo.startswith(("http://", "https://")):
                raise ValueError("Invalid logo URL format.")

        return self
