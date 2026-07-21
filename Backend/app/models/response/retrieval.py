from typing import Optional
from pydantic import BaseModel, Field


class RetrievalChunkResponse(BaseModel):
    """Envelope representing a single matching retrieved knowledge chunk."""

    chunkId: str = Field(..., description="Unique chunk identifier")
    documentId: str = Field(..., description="Document identifier the chunk belongs to")
    pageNumber: Optional[int] = Field(None, description="Page number of the chunk (if available)")
    similarityScore: float = Field(..., description="Cosine similarity score of the chunk to the query")
    chunkText: str = Field(..., description="Text content of the chunk")
