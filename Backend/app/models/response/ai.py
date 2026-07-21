from typing import List, Optional
from pydantic import BaseModel, Field


class SourceCitation(BaseModel):
    """Detailed source citation metadata for RAG-augmented answers."""

    documentName: Optional[str] = Field(None, description="Name of the source document")
    page: Optional[int] = Field(None, description="Page number of the chunk (if available)")
    chunkId: str = Field(..., description="Unique identifier of the source chunk")
    text: str = Field(..., description="Excerpt text content of the chunk")
    similarity: float = Field(..., description="Cosine similarity score of the chunk to the query")

    # Legacy fields for backward compatibility
    document_name: Optional[str] = Field(None, description="Legacy alias parameter for document layout")
    page_number: Optional[int] = Field(None, description="Legacy alias parameter for page Number")
    chunk_text: Optional[str] = Field(None, description="Legacy alias parameter for chunk text content")
    similarity_score: Optional[float] = Field(None, description="Legacy alias parameter for similarity score")


class ChatResponse(BaseModel):
    """Structured response for Q&A chatbot queries with citations and confidence metrics."""

    answer: str = Field(..., description="The generated response text from the model")
    citations: List[SourceCitation] = Field(default_factory=list, description="Structured source citations list used to formulate the answer")
    confidence: float = Field(..., description="Confidence similarity score from the underlying retrieval service (0.0 to 1.0)")


class ChatHistoryRecord(BaseModel):
    """Execution log tracking historical RAG conversations."""

    id: str = Field(..., description="Unique database document identifier of the session log")
    question: str = Field(..., description="User query question message")
    answer: str = Field(..., description="The generated response text from the model")
    citations: List[SourceCitation] = Field(default_factory=list, description="List of source document citations used")
    confidence: float = Field(..., description="Vector cosine similarity score (confidence)")
    timestamp: str = Field(..., description="ISO 8601 string timestamp representation of the query event time")
    companyId: str = Field(..., description="Tenant enterprise company identifier")
    userId: str = Field(..., description="The executing user profile identifier")
