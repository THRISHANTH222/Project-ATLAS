import { EmbeddingRepository } from '../interfaces/EmbeddingRepository';
import { EmbeddingRecord, EmbeddingStatus } from '../models/embedding.types';
/**
 * Firestore implementation of EmbeddingRepository using the project's existing services.
 * Keeps collections decoupled and isolated.
 */
export declare class FirestoreEmbeddingRepository implements EmbeddingRepository {
    private readonly embeddingService;
    private readonly statusService;
    constructor();
    /**
     * Persists a single embedding record to Firestore.
     */
    saveEmbedding(record: EmbeddingRecord): Promise<void>;
    /**
     * Persists multiple embedding records in atomic batches of 400.
     */
    saveMany(records: EmbeddingRecord[]): Promise<void>;
    /**
     * Creates or updates the status job registry of document processing.
     */
    updateStatus(companyId: string, documentId: string, status: EmbeddingStatus, failureReason?: string): Promise<void>;
    /**
     * Purges all chunk vectors and status metadata connected to a document ID.
     */
    deleteByDocument(companyId: string, documentId: string): Promise<void>;
    /**
     * Retrieves a single embedding record. Validates company bounds.
     */
    getEmbedding(companyId: string, embeddingId: string): Promise<EmbeddingRecord | null>;
    /**
     * Retrieves all vectors associated with a document ID.
     */
    getDocumentEmbeddings(companyId: string, documentId: string): Promise<EmbeddingRecord[]>;
}
//# sourceMappingURL=FirestoreEmbeddingRepository.d.ts.map