import { EmbeddingRepository } from '../interfaces/EmbeddingRepository';
import { EmbeddingRecord, EmbeddingStatus } from '../models/embedding.types';
import { FirestoreService } from '../../services/firestore.service';
import { EmbeddingStorageError } from '../errors/embedding.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('FirestoreEmbeddingRepository');

/**
 * Firestore implementation of EmbeddingRepository using the project's existing services.
 * Keeps collections decoupled and isolated.
 */
export class FirestoreEmbeddingRepository implements EmbeddingRepository {
  private readonly embeddingService: FirestoreService<any>;
  private readonly statusService: FirestoreService<any>;

  constructor() {
    this.embeddingService = new FirestoreService<any>('embeddings');
    this.statusService = new FirestoreService<any>('embedding_jobs');
  }

  /**
   * Persists a single embedding record to Firestore.
   */
  public async saveEmbedding(record: EmbeddingRecord): Promise<void> {
    try {
      logger.debug(`Saving embedding: ${record.embeddingId}`);
      await this.embeddingService.createWithId(record.embeddingId, {
        companyId: record.companyId,
        documentId: record.documentId,
        chunkId: record.chunkId,
        chunkIndex: record.chunkIndex,
        embeddingVector: record.embeddingVector,
        metadata: record.metadata,
      });
    } catch (error: any) {
      throw new EmbeddingStorageError(
        `Failed to save embedding ID '${record.embeddingId}' to database.`,
        error
      );
    }
  }

  /**
   * Persists multiple embedding records in atomic batches of 400.
   */
  public async saveMany(records: EmbeddingRecord[]): Promise<void> {
    if (!records || records.length === 0) return;

    try {
      logger.info(`Saving ${records.length} embeddings to database...`);
      const limit = 400; // Keep under 500 operations Firestore limit

      for (let i = 0; i < records.length; i += limit) {
        const slice = records.slice(i, i + limit);
        const operations = slice.map(record => ({
          type: 'set' as const,
          docId: record.embeddingId,
          data: {
            companyId: record.companyId,
            documentId: record.documentId,
            chunkId: record.chunkId,
            chunkIndex: record.chunkIndex,
            embeddingVector: record.embeddingVector,
            metadata: record.metadata,
          },
        }));
        await this.embeddingService.executeBatch(operations);
      }
    } catch (error: any) {
      throw new EmbeddingStorageError('Failed to execute batch insert in database.', error);
    }
  }

  /**
   * Creates or updates the status job registry of document processing.
   */
  public async updateStatus(
    companyId: string,
    documentId: string,
    status: EmbeddingStatus,
    failureReason?: string
  ): Promise<void> {
    try {
      logger.info(`Setting document job '${documentId}' status: ${status}`);
      const jobData: any = {
        companyId,
        documentId,
        status,
        updatedAt: new Date().toISOString(),
      };
      if (failureReason) {
        jobData.failureReason = failureReason;
      }
      await this.statusService.createWithId(documentId, jobData);
    } catch (error: any) {
      throw new EmbeddingStorageError(
        `Failed to write status metadata for document ID '${documentId}'.`,
        error
      );
    }
  }

  /**
   * Purges all chunk vectors and status metadata connected to a document ID.
   */
  public async deleteByDocument(companyId: string, documentId: string): Promise<void> {
    try {
      logger.info(`Deleting database vectors linked to document: ${documentId}`);
      const list = await this.getDocumentEmbeddings(companyId, documentId);

      if (list.length > 0) {
        const limit = 400;
        for (let i = 0; i < list.length; i += limit) {
          const slice = list.slice(i, i + limit);
          const operations = slice.map(record => ({
            type: 'delete' as const,
            docId: record.embeddingId,
          }));
          await this.embeddingService.executeBatch(operations);
        }
      }

      // Delete the status registration
      const statusExists = await this.statusService.exists(documentId);
      if (statusExists) {
        await this.statusService.delete(documentId);
      }
    } catch (error: any) {
      throw new EmbeddingStorageError(
        `Failed to delete database records for document ID '${documentId}'.`,
        error
      );
    }
  }

  /**
   * Retrieves a single embedding record. Validates company bounds.
   */
  public async getEmbedding(companyId: string, embeddingId: string): Promise<EmbeddingRecord | null> {
    try {
      const exists = await this.embeddingService.exists(embeddingId);
      if (!exists) return null;

      const record = await this.embeddingService.getById(embeddingId);
      if (record.companyId !== companyId) {
        return null; // Tenancy partition safety check
      }
      return record as unknown as EmbeddingRecord;
    } catch (error: any) {
      throw new EmbeddingStorageError(`Failed to fetch embedding ID '${embeddingId}'.`, error);
    }
  }

  /**
   * Retrieves all vectors associated with a document ID.
   */
  public async getDocumentEmbeddings(companyId: string, documentId: string): Promise<EmbeddingRecord[]> {
    try {
      const res = await this.embeddingService.query({
        filters: [
          { field: 'companyId', operator: '==', value: companyId },
          { field: 'documentId', operator: '==', value: documentId },
        ],
      });
      return res.data as unknown as EmbeddingRecord[];
    } catch (error: any) {
      throw new EmbeddingStorageError(
        `Failed to retrieve vectors list for document ID '${documentId}'.`,
        error
      );
    }
  }
}
