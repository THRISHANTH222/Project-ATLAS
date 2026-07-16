import { KnowledgeRepository, ListDocumentsOptions } from '../interfaces/KnowledgeRepository.interface';
import { KnowledgeDocument, KnowledgeChunk } from '../models/knowledge.types';
/**
 * Concrete Firestore repository implementation for the Knowledge Index catalog.
 */
export declare class FirestoreKnowledgeRepository implements KnowledgeRepository {
    private readonly docService;
    private readonly chunkService;
    constructor();
    /**
     * Registers a new document record.
     */
    createDocument(doc: KnowledgeDocument): Promise<void>;
    /**
     * Resolves document metadata by ID, checking company multi-tenant isolation.
     */
    getDocument(companyId: string, documentId: string): Promise<KnowledgeDocument | null>;
    /**
     * Finds a document with matching checksum hash, ignoring soft-deleted files.
     */
    getDocumentByChecksum(companyId: string, checksum: string): Promise<KnowledgeDocument | null>;
    /**
     * Modifies catalog document metadata fields.
     */
    updateDocument(companyId: string, documentId: string, updates: Partial<KnowledgeDocument>): Promise<void>;
    /**
     * Performs soft deletion, storing the deleted ISO timestamp.
     */
    softDeleteDocument(companyId: string, documentId: string): Promise<void>;
    /**
     * Permanently purges a document index registry.
     */
    hardDeleteDocument(companyId: string, documentId: string): Promise<void>;
    /**
     * Lists company files with status/health filters and sorting.
     */
    listDocuments(companyId: string, options: ListDocumentsOptions): Promise<{
        items: KnowledgeDocument[];
        lastVisibleSnapshot: any;
    }>;
    /**
     * Registers document chunks in atomic database batches.
     */
    registerChunks(chunks: KnowledgeChunk[]): Promise<void>;
    /**
     * Gathers all registered chunks for a document ordered by index.
     */
    getDocumentChunks(companyId: string, documentId: string): Promise<KnowledgeChunk[]>;
    /**
     * Purges all registered chunks for a document.
     */
    deleteChunksByDocument(companyId: string, documentId: string): Promise<void>;
}
//# sourceMappingURL=KnowledgeRepository.d.ts.map