import { KnowledgeDocument, KnowledgeChunk } from '../models/knowledge.types';

export interface ListDocumentsOptions {
  limit?: number;
  startAfterDoc?: any;
  status?: string;
  health?: string;
  searchFilename?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface KnowledgeRepository {
  /**
   * Registers a new document inside the catalog index.
   */
  createDocument(doc: KnowledgeDocument): Promise<void>;

  /**
   * Retrieves a document by its ID. Tenancy isolation check enforced.
   */
  getDocument(companyId: string, documentId: string): Promise<KnowledgeDocument | null>;

  /**
   * Finds a document matching a specific content hash checksum.
   */
  getDocumentByChecksum(companyId: string, checksum: string): Promise<KnowledgeDocument | null>;

  /**
   * Performs updates on a document record.
   */
  updateDocument(companyId: string, documentId: string, updates: Partial<KnowledgeDocument>): Promise<void>;

  /**
   * Flags a document record as logically deleted.
   */
  softDeleteDocument(companyId: string, documentId: string): Promise<void>;

  /**
   * Permanently deletes a document registry record.
   */
  hardDeleteDocument(companyId: string, documentId: string): Promise<void>;

  /**
   * Returns a paginated list of catalog documents matching criteria.
   */
  listDocuments(
    companyId: string,
    options: ListDocumentsOptions
  ): Promise<{ items: KnowledgeDocument[]; lastVisibleSnapshot: any }>;

  /**
   * Registers a batch of document chunks.
   */
  registerChunks(chunks: KnowledgeChunk[]): Promise<void>;

  /**
   * Retrieves chunk metadata registries linked to a document.
   */
  getDocumentChunks(companyId: string, documentId: string): Promise<KnowledgeChunk[]>;

  /**
   * Deletes all chunk registries linked to a document.
   */
  deleteChunksByDocument(companyId: string, documentId: string): Promise<void>;
}
