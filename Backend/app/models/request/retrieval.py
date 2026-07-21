from pydantic import BaseModel, Field


class RetrievalRequest(BaseModel):
    """Parameters for Knowledge Retrieval queries."""

    query: str = Field(
        ..., 
        min_length=1, 
        description="The search query text to find relevant document chunks for"
    )
    top_k: int = Field(
        default=5, 
        ge=1, 
        le=50, 
        description="The maximum number of top matching chunks to retrieve"
    )
