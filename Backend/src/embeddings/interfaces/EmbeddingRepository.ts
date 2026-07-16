import { EmbeddingRecord, EmbeddingStatus } from '../models/embedding.types';

/**
 * Storage Abstraction Layer interface.
 * Decouples the embedding service from specific vector stores or standard databases.
 */
export interface EmbeddingRepository {
  /**
   * Saves a single embedding record.
   */
  saveEmbedding(record: EmbeddingRecord): Promise<void>;

  /**
   * Batch persists multiple embedding records.
   */
  saveMany(records: EmbeddingRecord[]): Promise<void>;

  /**
   * Updates processing lifecycle status for a document.
   */
  updateStatus(
    companyId: string,
    documentId: string,
    status: EmbeddingStatus,
    failureReason?: string
  ): Promise<void>;

  /**
   * Purges all embedding vectors linked to a specific document.
   */
  deleteByDocument(companyId: string, documentId: string): Promise<void>;

  /**
   * Fetches a specific embedding record by its unique ID.
   */
  getEmbedding(companyId: string, embeddingId: string): Promise<EmbeddingRecord | null>;

  /**
   * Retrieves all chunks and vectors associated with a document.
   */
  getDocumentEmbeddings(companyId: string, documentId: string): Promise<EmbeddingRecord[]>;
}
