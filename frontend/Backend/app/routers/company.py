import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import get_current_user
from app.models.domain.company import Company
from app.models.request.company import CompanyCreateRequest, CompanyUpdateRequest
from app.models.response.company import CompanyResponse
from app.services import get_db_service
from app.services.base import IDatabaseService
from app.utils.exceptions import ConflictError, NotFoundError, ValidationError

router = APIRouter(prefix="/company", tags=["Companies"])


@router.post("", response_model=CompanyResponse, status_code=201)
async def create_company(
    payload: CompanyCreateRequest,
    db: IDatabaseService = Depends(get_db_service),
) -> CompanyResponse:
    """
    Registers a new company tenant in the platform.
    Prevents duplicate registrations if a unique corporate domain is specified.
    """
    if payload.domain:
        existing = await db.query_documents("companies", "domain", "==", payload.domain.strip().lower())
        if existing:
            raise ConflictError(f"A company with the domain '{payload.domain}' is already registered.")

    company_id = f"comp-{str(uuid.uuid4())[:8]}"
    now = datetime.now(timezone.utc)

    company = Company(
        id=company_id,
        name=payload.name.strip(),
        domain=payload.domain.strip().lower() if payload.domain else None,
        logo_url=payload.logo_url.strip() if payload.logo_url else None,
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    await db.create_document("companies", company.model_dump(), doc_id=company_id)
    return CompanyResponse(
        status="success",
        message="Company registered successfully.",
        data=company
    )


@router.get("", response_model=CompanyResponse)
async def get_company(
    company_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
) -> CompanyResponse:
    """
    Retrieves company details.
    Uses the query parameter `company_id` if provided, otherwise infers the target
    company from the authenticated user's JWT context token.
    """
    resolved_id = company_id or current_user.get("tenant_id") or current_user.get("company_id")
    if not resolved_id:
        raise ValidationError(
            "Company ID could not be determined. Please supply a 'company_id' parameter "
            "or verify your authorization token context."
        )

    company_data = await db.get_document("companies", resolved_id)
    if not company_data:
        raise NotFoundError(f"Company profile '{resolved_id}' was not found.")

    return CompanyResponse(
        status="success",
        data=Company(**company_data)
    )


@router.patch("", response_model=CompanyResponse)
async def patch_company(
    payload: CompanyUpdateRequest,
    company_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: IDatabaseService = Depends(get_db_service),
) -> CompanyResponse:
    """
    Updates company tenant configuration parameters.
    Uses the query parameter `company_id` if provided, otherwise infers the target
    company from the authenticated user's JWT context token.
    """
    resolved_id = company_id or current_user.get("tenant_id") or current_user.get("company_id")
    if not resolved_id:
        raise ValidationError(
            "Company ID could not be determined. Please supply a 'company_id' parameter "
            "or verify your authorization token context."
        )

    company_data = await db.get_document("companies", resolved_id)
    if not company_data:
        raise NotFoundError(f"Company profile '{resolved_id}' was not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    if not update_dict:
        return CompanyResponse(
            status="success",
            message="No update parameters were provided.",
            data=Company(**company_data)
        )

    # Sanitize and merge fields
    if "name" in update_dict and update_dict["name"]:
        update_dict["name"] = update_dict["name"].strip()
    if "domain" in update_dict and update_dict["domain"]:
        update_dict["domain"] = update_dict["domain"].strip().lower()

    update_dict["updated_at"] = datetime.now(timezone.utc)

    # Call database update
    await db.update_document("companies", resolved_id, update_dict)

    # Retrieve updated entity
    updated_company = await db.get_document("companies", resolved_id)
    return CompanyResponse(
        status="success",
        message="Company details updated successfully.",
        data=Company(**updated_company) # type: ignore
    )
