from pydantic import BaseModel, Field

class DocumentDownloadResponse(BaseModel):
    """
    Standard schema for a document's signed download URL response.
    """
    documentId: str = Field(..., description="The unique document identifier")
    filename: str = Field(..., description="The original filename of the document")
    downloadUrl: str = Field(..., description="The temporary secure signed URL")
    expiresIn: int = Field(..., description="The expiration period of the signed URL in seconds")
