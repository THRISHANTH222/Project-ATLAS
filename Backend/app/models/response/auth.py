from typing import Any, Dict
from pydantic import BaseModel, Field


class TokenVerificationResponse(BaseModel):
    """Enriched result returned after authentication token verification."""

    uid: str = Field(..., description="Unique user UID")
    email: str = Field(..., description="Email address associated with the user")
    display_name: str = Field(..., description="Display name of the authenticated user")
    claims: Dict[str, Any] = Field(default_factory=dict, description="Raw claims from JWT ID Token")
