from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class User(BaseModel):
    """Core Domain Model representing an Enterprise User."""

    id: str = Field(..., description="Unique Firebase User Identifier (UID)")
    email: EmailStr = Field(..., description="Primary email address")
    display_name: Optional[str] = Field(None, description="User's display or full name")
    roles: List[str] = Field(default_factory=lambda: ["user"], description="Security authorization roles")
    is_active: bool = Field(default=True, description="Account status flag")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of account creation")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of last update")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "firebase-uid-123456",
                "email": "user@enterprise.com",
                "display_name": "Jane Doe",
                "roles": ["user", "admin"],
                "is_active": True,
                "created_at": "2026-07-12T23:09:26",
                "updated_at": "2026-07-12T23:09:26",
            }
        }
    )
