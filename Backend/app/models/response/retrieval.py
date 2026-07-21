from typing import Optional
from pydantic import BaseModel, Field


class RetrievalChunkResponse(BaseModel):
    """Envelope representing a single matching retrieved knowledge chunk."""

    chunkId: str = Field(..., description="Unique chunk identifier")
    documentId: str = Field(..., description="Document identifier the chunk belongs to")
    documentName: Optional[str] = Field(None, description="Filename/document label of the chunk")
    page: Optional[int] = Field(None, description="Page number of the chunk (if available)")
    similarity: float = Field(..., description="Cosine similarity score of the chunk to the query")
    text: str = Field(..., description="Text content of the chunk")

    # Legacy properties to maintain backward compatibility
    pageNumber: Optional[int] = Field(None, description="Legacy page number mapping")
    similarityScore: Optional[float] = Field(None, description="Legacy similarity score mapping")
    chunkText: Optional[str] = Field(None, description="Legacy chunk text mapping")
