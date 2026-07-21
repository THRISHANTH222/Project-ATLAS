from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class Task(BaseModel):
    """Core Domain Model representing an asynchronous background task or work entity."""

    id: str = Field(..., description="Unique Task Identifier")
    tenant_id: str = Field(..., description="Tenant identifier to isolate company data")
    user_id: str = Field(..., description="The user identifier who triggered or owns the task")
    title: str = Field(..., max_length=255, description="Short summary/title of the task")
    description: Optional[str] = Field(None, description="Detailed text body of the task")
    status: str = Field(default="pending", description="State (e.g. pending, processing, completed, failed)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary custom schema payload")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "task-uuid-9876",
                "tenant_id": "company-xyz",
                "user_id": "firebase-uid-123456",
                "title": "Analyze monthly financial statements",
                "description": "Run pipeline using Gemini model to search for anomalies.",
                "status": "processing",
                "metadata": {"file_name": "q3_report.pdf"},
                "created_at": "2026-07-12T23:09:26",
                "updated_at": "2026-07-12T23:09:26",
            }
        }
    )
