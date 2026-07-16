import { KnowledgeRepository, ListDocumentsOptions } from '../interfaces/KnowledgeRepository.interface';
import { KnowledgeDocument, KnowledgeChunk } from '../models/knowledge.types';
import { FirestoreService } from '../../services/firestore.service';
import { Logger } from '../../utils/logger';

const logger = new Logger('FirestoreKnowledgeRepository');

/**
 * Concrete Firestore repository implementation for the Knowledge Index catalog.
 */
export class FirestoreKnowledgeRepository implements KnowledgeRepository {
  private readonly docService: FirestoreService<any>;
  private readonly chunkService: FirestoreService<any>;

  constructor() {
    this.docService = new FirestoreService<any>('knowledge_documents');
    this.chunkService = new FirestoreService<any>('knowledge_chunks');
  }

  /**
   * Registers a new document record.
   */
  public async createDocument(doc: KnowledgeDocument): Promise<void> {
    logger.debug(`Writing document index documentId: ${doc.documentId}`);
    await this.docService.createWithId(doc.documentId, doc);
  }

  /**
   * Resolves document metadata by ID, checking company multi-tenant isolation.
   */
  public async getDocument(companyId: string, documentId: string): Promise<KnowledgeDocument | null> {
    const exists = await this.docService.exists(documentId);
    if (!exists) return null;

    const doc = await this.docService.getById(documentId);
    if (doc.companyId !== companyId || doc.deletedAt) {
      return null; // Tenancy boundary or soft deleted
    }
    return doc as unknown as KnowledgeDocument;
  }

  /**
   * Finds a document with matching checksum hash, ignoring soft-deleted files.
   */
  public async getDocumentByChecksum(companyId: string, checksum: string): Promise<KnowledgeDocument | null> {
    const result = await this.docService.query({
      filters: [
        { field: 'companyId', operator: '==', value: companyId },
        { field: 'checksum', operator: '==', value: checksum },
      ],
      limit: 1,
    });
    
    const active = result.data.filter(d => !d.deletedAt);
    return active.length > 0 ? (active[0] as unknown as KnowledgeDocument) : null;
  }

  /**
   * Modifies catalog document metadata fields.
   */
  public async updateDocument(
    companyId: string,
    documentId: string,
    updates: Partial<KnowledgeDocument>
  ): Promise<void> {
    const doc = await this.getDocument(companyId, documentId);
    if (!doc) {
      throw new Error(`Document with ID '${documentId}' does not exist or belongs to another company.`);
    }
    await this.docService.update(documentId, updates);
  }

  /**
   * Performs soft deletion, storing the deleted ISO timestamp.
   */
  public async softDeleteDocument(companyId: string, documentId: string): Promise<void> {
    await this.updateDocument(companyId, documentId, {
      deletedAt: new Date().toISOString(),
    });
  }

  /**
   * Permanently purges a document index registry.
   */
  public async hardDeleteDocument(companyId: string, documentId: string): Promise<void> {
    const doc = await this.getDocument(companyId, documentId);
    if (!doc) {
      throw new Error(`Document with ID '${documentId}' does not exist or belongs to another company.`);
    }
    await this.docService.delete(documentId);
  }

  /**
   * Lists company files with status/health filters and sorting.
   */
  public async listDocuments(
    companyId: string,
    options: ListDocumentsOptions
  ): Promise<{ items: KnowledgeDocument[]; lastVisibleSnapshot: any }> {
    const filters: any[] = [
      { field: 'companyId', operator: '==', value: companyId },
    ];

    if (options.status) {
      filters.push({ field: 'status', operator: '==', value: options.status });
    }
    if (options.health) {
      filters.push({ field: 'health', operator: '==', value: options.health });
    }

    const orderBy: any[] = [];
    if (options.sortBy) {
      orderBy.push({ field: options.sortBy, direction: options.sortDirection || 'asc' });
    } else {
      orderBy.push({ field: 'createdAt', direction: 'desc' });
    }

    const result = await this.docService.query({
      filters,
      orderBy,
      limit: options.limit || 50,
      startAfterDoc: options.startAfterDoc,
    });

    let items = result.data as unknown as KnowledgeDocument[];

    // In-memory filters
    items = items.filter(doc => !doc.deletedAt);

    if (options.searchFilename) {
      const term = options.searchFilename.toLowerCase();
      items = items.filter(doc => doc.filename.toLowerCase().includes(term));
    }

    return {
      items,
      lastVisibleSnapshot: result.lastVisibleSnapshot,
    };
  }

  /**
   * Registers document chunks in atomic database batches.
   */
  public async registerChunks(chunks: KnowledgeChunk[]): Promise<void> {
    if (!chunks || chunks.length === 0) return;
    logger.info(`Persisting ${chunks.length} chunks to catalog...`);
    const limit = 400;

    for (let i = 0; i < chunks.length; i += limit) {
      const slice = chunks.slice(i, i + limit);
      const operations = slice.map(chunk => ({
        type: 'set' as const,
        docId: chunk.chunkId,
        data: chunk,
      }));
      await this.chunkService.executeBatch(operations);
    }
  }

  /**
   * Gathers all registered chunks for a document ordered by index.
   */
  public async getDocumentChunks(companyId: string, documentId: string): Promise<KnowledgeChunk[]> {
    const result = await this.chunkService.query({
      filters: [
        { field: 'companyId', operator: '==', value: companyId },
        { field: 'documentId', operator: '==', value: documentId },
      ],
      orderBy: [{ field: 'chunkIndex', direction: 'asc' }],
    });
    return result.data as unknown as KnowledgeChunk[];
  }

  /**
   * Purges all registered chunks for a document.
   */
  public async deleteChunksByDocument(companyId: string, documentId: string): Promise<void> {
    const chunks = await this.getDocumentChunks(companyId, documentId);
    if (chunks.length === 0) return;

    const limit = 400;
    for (let i = 0; i < chunks.length; i += limit) {
      const slice = chunks.slice(i, i + limit);
      const operations = slice.map(chunk => ({
        type: 'delete' as const,
        docId: chunk.chunkId,
      }));
      await this.chunkService.executeBatch(operations);
    }
  }
}
