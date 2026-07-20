from pydantic import BaseModel, Field

class UploadMetadataResponse(BaseModel):
    """
    Standard schema for file upload metadata stored in Firestore.
    """
    # Legacy fields
    id: str = Field(..., description="The unique document identifier in Firestore")
    company_id: str = Field(..., description="The associated tenant company ID")
    filename: str = Field(..., description="The original filename of the uploaded file")
    file_size: int = Field(..., description="The size of the file in bytes")
    content_type: str = Field(..., description="The validated MIME content type")
    hash: str = Field(..., description="SHA-256 hash value of the file content")
    storage_path: str = Field(..., description="The path of the file in the bucket")
    public_url: str = Field(..., description="The public URL to access the file")
    uploaded_by: str = Field(..., description="UID of the user who uploaded the file")
    uploaded_at: str = Field(..., description="ISO 8601 UTC timestamp of the upload")

    # Phase 6 fields
    documentId: str = Field(..., description="The generated document UUID")
    companyId: str = Field(..., description="The tenant company ID")
    storagePath: str = Field(..., description="The storage path returned by the service")
    status: str = Field(default="Uploaded", description="Processing status of the document")
