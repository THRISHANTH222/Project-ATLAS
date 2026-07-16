import { KnowledgeRepository, ListDocumentsOptions } from '../interfaces/KnowledgeRepository.interface';
import { FirestoreKnowledgeRepository } from '../repositories/KnowledgeRepository';
import { 
  KnowledgeDocument, 
  KnowledgeChunk, 
  ProcessingStatus, 
  HealthStatus 
} from '../models/knowledge.types';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { DocumentHealthReportDto } from '../dto/document-health.dto';
import { 
  KnowledgeDocumentNotFoundError, 
  InvalidStatusTransitionError, 
  CompanyMismatchError, 
  DuplicateDocumentError 
} from '../errors/knowledge.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('KnowledgeIndexService');

const VALID_TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
  [ProcessingStatus.UPLOADED]: [ProcessingStatus.PARSING, ProcessingStatus.FAILED],
  [ProcessingStatus.PARSING]: [ProcessingStatus.PARSED, ProcessingStatus.FAILED],
  [ProcessingStatus.PARSED]: [ProcessingStatus.CHUNKING, ProcessingStatus.FAILED],
  [ProcessingStatus.CHUNKING]: [ProcessingStatus.CHUNKED, ProcessingStatus.FAILED],
  [ProcessingStatus.CHUNKED]: [ProcessingStatus.EMBEDDING, ProcessingStatus.FAILED],
  [ProcessingStatus.EMBEDDING]: [ProcessingStatus.EMBEDDED, ProcessingStatus.FAILED],
  [ProcessingStatus.EMBEDDED]: [ProcessingStatus.INDEXING, ProcessingStatus.FAILED],
  [ProcessingStatus.INDEXING]: [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED],
  [ProcessingStatus.COMPLETED]: [ProcessingStatus.ARCHIVED, ProcessingStatus.FAILED],
  [ProcessingStatus.FAILED]: [
    ProcessingStatus.PARSING,
    ProcessingStatus.CHUNKING,
    ProcessingStatus.EMBEDDING,
    ProcessingStatus.ARCHIVED,
  ],
  [ProcessingStatus.ARCHIVED]: [ProcessingStatus.COMPLETED],
};

/**
 * Service managing document catalog indices, chunk metadata registers,
 * and computed document health indicators.
 */
export class KnowledgeIndexService {
  private readonly repository: KnowledgeRepository;

  /**
   * Initializes KnowledgeIndexService.
   * Supports injecting alternative storage repositories for clean test setups.
   */
  constructor(repository?: KnowledgeRepository) {
    this.repository = repository || new FirestoreKnowledgeRepository();
  }

  /**
   * Registers a processed document inside the catalog index.
   * Prevents duplicates by verifying content checksum hash.
   */
  public async registerDocument(
    companyId: string,
    documentId: string,
    dto: CreateDocumentDto
  ): Promise<KnowledgeDocument> {
    logger.info(`Registering document metadata: ${documentId} for company: ${companyId}`);

    // Check duplicate content hashes
    const existing = await this.repository.getDocumentByChecksum(companyId, dto.checksum);
    if (existing) {
      logger.warn(`Duplicate content detected. Checksum: ${dto.checksum}`);
      throw new DuplicateDocumentError(dto.checksum);
    }

    const timestamp = new Date().toISOString();
    const doc: KnowledgeDocument = {
      ...dto,
      documentId,
      companyId,
      uploadTimestamp: timestamp,
      health: HealthStatus.HEALTHY,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };

    await this.repository.createDocument(doc);
    return doc;
  }

  /**
   * Fetches document registry metadata.
   */
  public async getDocument(companyId: string, documentId: string): Promise<KnowledgeDocument> {
    const doc = await this.repository.getDocument(companyId, documentId);
    if (!doc) {
      throw new KnowledgeDocumentNotFoundError(documentId);
    }
    return doc;
  }

  /**
   * Lists company files with criteria filters.
   */
  public async listDocuments(
    companyId: string,
    options: ListDocumentsOptions
  ): Promise<{ items: KnowledgeDocument[]; lastVisibleSnapshot: any }> {
    return this.repository.listDocuments(companyId, options);
  }

  /**
   * Validates and updates processing lifecycle status of a document.
   */
  public async updateStatus(
    companyId: string,
    documentId: string,
    newStatus: ProcessingStatus,
    failureReason?: string
  ): Promise<void> {
    const doc = await this.getDocument(companyId, documentId);

    // Enforce transition limits
    const allowed = VALID_TRANSITIONS[doc.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new InvalidStatusTransitionError(doc.status, newStatus);
    }

    const updates: Partial<KnowledgeDocument> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (failureReason) {
      updates.failureReason = failureReason;
      updates.health = HealthStatus.ERROR;
    }

    // Adjust processing duration on completion
    if (newStatus === ProcessingStatus.COMPLETED) {
      updates.processedTimestamp = new Date().toISOString();
      const start = new Date(doc.uploadTimestamp).getTime();
      const end = Date.now();
      updates.processingDuration = end - start;
    }

    await this.repository.updateDocument(companyId, documentId, updates);
  }

  /**
   * Calculates health metrics for monitoring and administrative dashboards.
   */
  public async calculateDocumentHealth(companyId: string, documentId: string): Promise<DocumentHealthReportDto> {
    const doc = await this.getDocument(companyId, documentId);
    const issues: string[] = [];
    let health: HealthStatus = HealthStatus.HEALTHY;

    // Check status
    if (doc.status === ProcessingStatus.FAILED) {
      health = HealthStatus.ERROR;
      issues.push(`Document processing failed: ${doc.failureReason || 'Reason unspecified'}`);
    }

    // Check embedding alignment
    if (doc.status === ProcessingStatus.COMPLETED) {
      if (doc.totalChunks !== doc.totalEmbeddings) {
        health = HealthStatus.WARNING;
        issues.push(
          `Embedding mismatch. Metadata lists ${doc.totalChunks} chunks but only ${doc.totalEmbeddings} vectors.`
        );
      }
    }

    // Check chunk list size consistency
    const chunks = await this.repository.getDocumentChunks(companyId, documentId);
    if (doc.status !== ProcessingStatus.UPLOADED && doc.status !== ProcessingStatus.PARSING) {
      if (chunks.length !== doc.totalChunks) {
        health = HealthStatus.WARNING;
        issues.push(
          `Chunk registry mismatch. Metadata lists ${doc.totalChunks} chunks but found ${chunks.length} records.`
        );
      }
    }

    if (issues.length > 0 && health === HealthStatus.HEALTHY) {
      health = HealthStatus.WARNING;
    }

    // Keep document health state synchronized in the database
    if (doc.health !== health) {
      await this.repository.updateDocument(companyId, documentId, { health });
    }

    return {
      documentId,
      companyId,
      health,
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Performs soft deletion of a document index registry.
   */
  public async softDeleteDocument(companyId: string, documentId: string): Promise<void> {
    logger.info(`Logical delete document: ${documentId} for company: ${companyId}`);
    await this.repository.softDeleteDocument(companyId, documentId);
  }

  /**
   * Registers a list of lightweight chunk metadata structures.
   */
  public async registerDocumentChunks(
    companyId: string,
    documentId: string,
    chunks: Omit<KnowledgeChunk, 'companyId' | 'documentId' | 'createdAt'>[]
  ): Promise<void> {
    const doc = await this.getDocument(companyId, documentId);
    
    const createdAt = new Date().toISOString();
    const records: KnowledgeChunk[] = chunks.map(c => ({
      ...c,
      companyId,
      documentId,
      createdAt,
    }));

    await this.repository.registerChunks(records);

    // Sync total chunks count
    await this.repository.updateDocument(companyId, documentId, {
      totalChunks: doc.totalChunks + chunks.length,
      updatedAt: createdAt,
    });
  }
}
export const knowledgeIndexService = new KnowledgeIndexService();
