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

    def _calculate_rerank_score(self, query: str, chunk: Dict[str, Any], raw_similarity: float) -> float:
        """
        Calculates a hybrid semantic-lexical score for the chunk based on the query.
        Combines vector cosine similarity with query term matches, exact phrases, 
        and metadata keywords/tags/headings overlap.
        """
        import re
        query_lower = query.lower()
        text_lower = chunk.get("text", "").lower()
        
        # 1. Stopwords list
        stopwords = {
            "about", "above", "after", "again", "against", "all", "an", "and", "any", "are", "as", 
            "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
            "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", 
            "for", "from", "further", "had", "has", "have", "having", "he", "her", "here", "him", 
            "his", "how", "if", "in", "into", "is", "it", "its", "me", "more", "most", "my", "no", 
            "nor", "not", "of", "off", "on", "once", "only", "or", "other", "our", "ours", "out", 
            "over", "own", "same", "she", "should", "so", "some", "such", "than", "that", "the", 
            "their", "them", "then", "there", "these", "they", "this", "those", "through", "to", 
            "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", 
            "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours"
        }
        
        # 2. Extract query terms (excluding punctuation and stopwords)
        query_words = re.findall(r"\b\w{3,}\b", query_lower)  # Words of 3+ chars
        important_query_words = [w for w in query_words if w not in stopwords]
        
        if not important_query_words:
            return raw_similarity
            
        # 3. Calculate lexical overlap (percentage of query terms present in text)
        matched_words = sum(1 for w in important_query_words if w in text_lower)
        lexical_match_ratio = matched_words / len(important_query_words)
        
        # 4. Exact phrase matching bonus
        phrase_bonus = 0.0
        # If the query contains multi-word phrases that appear exactly in text
        if len(important_query_words) > 1:
            clean_query_str = " ".join(important_query_words)
            if clean_query_str in text_lower:
                phrase_bonus += 0.15
            elif query_lower in text_lower:
                phrase_bonus += 0.2
                
        # 5. Metadata relevance booster (Keywords & Tags & Headings)
        metadata_bonus = 0.0
        
        # Extract keywords/tags from chunk metadata
        doc = chunk.get("_raw_doc", {})
        chunk_meta = doc.get("metadata", {}).get("chunkMetadata", {}) if isinstance(doc.get("metadata"), dict) else {}
        
        keywords = []
        tags = []
        heading = ""
        section = ""
        
        if isinstance(doc.get("metadata"), dict):
            keywords = chunk_meta.get("keywords") or doc.get("metadata", {}).get("keywords") or []
            tags = chunk_meta.get("tags") or doc.get("metadata", {}).get("tags") or []
            heading = chunk_meta.get("heading") or doc.get("metadata", {}).get("heading") or ""
            section = chunk_meta.get("section") or doc.get("metadata", {}).get("section") or ""
        
        # Case-insensitive checks
        keywords_lower = [str(k).lower() for k in keywords]
        tags_lower = [str(t).lower() for t in tags]
        heading_lower = str(heading).lower()
        section_lower = str(section).lower()
        
        for w in important_query_words:
            if w in keywords_lower:
                metadata_bonus += 0.05
            if w in tags_lower:
                metadata_bonus += 0.03
            if w in heading_lower:
                metadata_bonus += 0.08
            if w in section_lower:
                metadata_bonus += 0.04
                
        # Cap bonuses to logical ranges
        phrase_bonus = min(phrase_bonus, 0.25)
        metadata_bonus = min(metadata_bonus, 0.25)
        
        # Calculate hybrid re-rank score
        # 0.6 weight on vector similarity, 0.25 on token presence, 0.15 on exact matches/metadata
        hybrid_score = (0.6 * raw_similarity) + (0.25 * lexical_match_ratio) + (0.15 * (phrase_bonus + metadata_bonus))
        
        return min(max(hybrid_score, 0.0), 1.0)

    async def retrieve_relevant_chunks(
        self,
        company_id: str,
        query: str,
        top_k: int = 5,
        document_type: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the top K most relevant document chunks matching vector similarity and rerank.
        Strictly isolates retrieval to the caller's companyId tenant space.
        """
        logger.info(
            f"Retrieval request received. Company: {company_id}, "
            f"Query: '{query[:50]}...', Top K: {top_k}, Type: {document_type}, Dept: {department}"
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
            logger.debug(f"Querying database chunks for companyId: {company_id}")
            chunks = await self.db.query_documents("chunks", "companyId", "==", company_id)
            if not chunks:
                chunks = await self.db.query_documents("chunks", "company_id", "==", company_id)
            if not chunks:
                chunks = await self.db.query_documents("embeddings", "companyId", "==", company_id)
            if not chunks:
                chunks = await self.db.query_documents("embeddings", "company_id", "==", company_id)
        except Exception as e:
            logger.error(f"Failed to retrieve chunks from database: {e}")
            raise DatabaseError(f"Database query for company document chunks failed: {str(e)}")

        if not chunks:
            logger.info(f"No document chunks found for company: {company_id}")
            return []

        # 3. Metadata Filtering (documentType and department optional filters)
        filtered_chunks = []
        for doc in chunks:
            # Tenancy check
            doc_company = doc.get("companyId") or doc.get("company_id")
            if doc_company != company_id:
                continue

            metadata_dict = doc.get("metadata") or {}
            chunk_metadata = metadata_dict.get("chunkMetadata") or {}

            # Document Type exact filter (case-insensitive)
            if document_type:
                doc_type_val = doc.get("documentType") or metadata_dict.get("documentType") or chunk_metadata.get("documentType")
                if not doc_type_val or str(doc_type_val).lower() != document_type.lower():
                    continue

            # Department exact filter (case-insensitive)
            if department:
                dept_val = doc.get("department") or metadata_dict.get("department") or chunk_metadata.get("department")
                if not dept_val or str(dept_val).lower() != department.lower():
                    continue

            filtered_chunks.append(doc)

        if not filtered_chunks:
            logger.info(f"No chunks left after applying metadata filters (Type: {document_type}, Dept: {department})")
            return []

        logger.info(f"Retrieved {len(filtered_chunks)} candidate chunks for company {company_id}. Computing similarities...")

        # 4. In-Memory Cosine Similarity Calculation
        scored_chunks = []
        for idx, doc in enumerate(filtered_chunks):
            vector = doc.get("embedding") or doc.get("vector") or doc.get("embeddingVector") or doc.get("embedding_vector")
            if not vector:
                logger.warning(f"Chunk at index {idx} does not contain valid embeddingVector. Skipping.")
                continue

            score = self._cosine_similarity(query_vector, vector)

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

            heading_val = self._extract_field(
                doc,
                ["heading", "metadata.heading", "metadata.chunkMetadata.heading"],
                ""
            )
            section_val = self._extract_field(
                doc,
                ["section", "metadata.section", "metadata.chunkMetadata.section"],
                ""
            )

            scored_chunks.append({
                "chunkId": chunk_id,
                "documentId": doc_id,
                "documentName": doc_name,
                "page": page_number,
                "similarity": float(score),
                "text": chunk_text,
                "_raw_doc": doc,
                "heading": heading_val,
                "section": section_val,
                # Legacy keys
                "pageNumber": page_number,
                "similarityScore": float(score),
                "chunkText": chunk_text
            })

        # 5. Filter top 20 raw cosine matches
        scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        top_20_candidates = scored_chunks[:20]

        # 6. Apply Semantic Hybrid Reranking on Top 20 Candidates
        reranked_chunks = []
        for item in top_20_candidates:
            rerank_score = self._calculate_rerank_score(query, item, item["similarity"])
            item["similarity"] = float(rerank_score)
            item["similarityScore"] = float(rerank_score)
            item.pop("_raw_doc", None)  # Clean reference
            reranked_chunks.append(item)

        # 7. Sort by final rerank score and return top K
        reranked_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        top_results = reranked_chunks[:top_k]

        logger.info(f"Reranking complete. Returning top {len(top_results)} matches.")
        return top_results
