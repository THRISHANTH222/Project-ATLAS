import math
from typing import Any, Dict, List, Optional
from app.services.base import IRetrievalService, IDatabaseService, IAIService
from app.utils.logger import get_logger
from app.utils.exceptions import DatabaseError, AIServiceError

logger = get_logger("app.services.retrieval")


class KnowledgeRetrievalService(IRetrievalService):
    """
    Knowledge Retrieval Engine service implementation.
    Generates embeddings for user queries and matches them against document chunks
    stored in the database using vector cosine similarity.
    Ensures robust extraction of chunk text, page numbers, and strict tenant company isolation.
    """

    def __init__(self, db: IDatabaseService, ai: IAIService):
        self.db = db
        self.ai = ai
        logger.info("KnowledgeRetrievalService initialized.")

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """
        Calculates the cosine similarity between two float vectors.
        """
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        
        try:
            dot_product = sum(a * b for a, b in zip(v1, v2))
            norm_a = math.sqrt(sum(a * a for a in v1))
            norm_b = math.sqrt(sum(b * b for b in v2))
            
            if norm_a == 0.0 or norm_b == 0.0:
                return 0.0
                
            return dot_product / (norm_a * norm_b)
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0

    def _extract_field(self, data: Dict[str, Any], keys: List[str], default: Any = None) -> Any:
        """
        Helper method to extract nested values using a list of potential key paths.
        Allows for flexible data schema extraction.
        """
        for key_path in keys:
            parts = key_path.split(".")
            curr = data
            for part in parts:
                if isinstance(curr, dict) and part in curr:
                    curr = curr[part]
                else:
                    curr = None
                    break
            if curr is not None:
                return curr
        return default

    async def retrieve_relevant_chunks(
        self,
        company_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the top K most relevant document chunks using vector similarity.
        Strictly isolates retrieval to the caller's companyId tenant space.
        """
        logger.info(
            f"Retrieval request received. Company: {company_id}, "
            f"Query: '{query[:50]}...', Top K: {top_k}"
        )

        if not query or not query.strip():
            logger.warning("Empty search query provided to retrieval engine.")
            return []

        # 1. Generate Query Vector Embedding using same model
        try:
            logger.debug(f"Generating query embedding vector...")
            query_vector = await self.ai.embed_content(query)
            if not query_vector:
                raise AIServiceError("Received empty embedding vector from AI service.")
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            raise AIServiceError(f"Query embedding generation failed: {str(e)}")

        # 2. Retrieve All Document Chunk Vectors for Company (Tenant Isolation)
        try:
            logger.debug(f"Querying database embeddings for companyId: {company_id}")
            chunks = await self.db.query_documents(
                collection="embeddings",
                field_path="companyId",
                op_string="==",
                value=company_id
            )
            
            # Fallback to check company_id key if no results returned under companyId
            if not chunks:
                logger.debug(f"No results found for companyId. Querying fallback field company_id: {company_id}")
                chunks = await self.db.query_documents(
                    collection="embeddings",
                    field_path="company_id",
                    op_string="==",
                    value=company_id
                )
        except Exception as e:
            logger.error(f"Failed to retrieve chunks from database: {e}")
            raise DatabaseError(f"Database query for company document chunks failed: {str(e)}")

        if not chunks:
            logger.info(f"No document chunks found for company: {company_id}")
            return []

        logger.info(f"Retrieved {len(chunks)} candidate chunks for company {company_id}. Computing similarities...")

        # 3. Compute Similarity Scores
        scored_chunks = []
        for idx, doc in enumerate(chunks):
            # Strict tenant safety check
            doc_company = doc.get("companyId") or doc.get("company_id")
            if doc_company != company_id:
                logger.critical(
                    f"TENANCY LEAK ATTEMPT PREVENTED: Document chunk contains "
                    f"company ID '{doc_company}', expected '{company_id}'. Filtering out chunk."
                )
                continue

            vector = doc.get("embeddingVector") or doc.get("embedding_vector")
            if not vector:
                logger.warning(f"Chunk at index {idx} does not contain valid embeddingVector. Skipping.")
                continue

            # Compute similarity
            score = self._cosine_similarity(query_vector, vector)

            # Robust field extraction
            chunk_id = self._extract_field(
                doc,
                ["chunkId", "chunk_id", "metadata.chunkId", "metadata.chunk_id", "id"],
                f"unknown-chunk-{idx}"
            )
            
            doc_id = self._extract_field(
                doc,
                ["documentId", "document_id", "metadata.documentId", "metadata.document_id"],
                "unknown-document"
            )

            # Extract chunk text content
            chunk_text = self._extract_field(
                doc,
                [
                    "content",
                    "chunkText",
                    "text",
                    "metadata.chunkText",
                    "metadata.content",
                    "metadata.text",
                    "metadata.chunkMetadata.content"
                ],
                ""
            )

            # Extract page number
            page_number = self._extract_field(
                doc,
                [
                    "pageNumber",
                    "page_number",
                    "page",
                    "metadata.pageNumber",
                    "metadata.page_number",
                    "metadata.page",
                    "metadata.chunkMetadata.page",
                    "metadata.chunkMetadata.pageNumber"
                ],
                1
            )

            # Attempt parsing page number to integer
            if page_number is not None:
                try:
                    page_number = int(page_number)
                except (ValueError, TypeError):
                    pass

            doc_name = self._extract_field(
                doc,
                ["documentName", "document_name", "metadata.documentName", "metadata.document_name", "filename", "metadata.filename"],
                "unknown-document"
            )

            scored_chunks.append({
                "chunkId": chunk_id,
                "documentId": doc_id,
                "documentName": doc_name,
                "page": page_number,
                "similarity": float(score),
                "text": chunk_text,
                # Legacy keys
                "pageNumber": page_number,
                "similarityScore": float(score),
                "chunkText": chunk_text
            })

        # 4. Sort and Filter Top K
        scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        top_results = scored_chunks[:top_k]

        logger.info(f"Similarity computing complete. Returning top {len(top_results)} matches.")
        return top_results
