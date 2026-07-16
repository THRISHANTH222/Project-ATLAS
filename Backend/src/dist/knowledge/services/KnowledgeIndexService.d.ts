import { KnowledgeRepository, ListDocumentsOptions } from '../interfaces/KnowledgeRepository.interface';
import { KnowledgeDocument, KnowledgeChunk, ProcessingStatus } from '../models/knowledge.types';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { DocumentHealthReportDto } from '../dto/document-health.dto';
/**
 * Service managing document catalog indices, chunk metadata registers,
 * and computed document health indicators.
 */
export declare class KnowledgeIndexService {
    private readonly repository;
    /**
     * Initializes KnowledgeIndexService.
     * Supports injecting alternative storage repositories for clean test setups.
     */
    constructor(repository?: KnowledgeRepository);
    /**
     * Registers a processed document inside the catalog index.
     * Prevents duplicates by verifying content checksum hash.
     */
    registerDocument(companyId: string, documentId: string, dto: CreateDocumentDto): Promise<KnowledgeDocument>;
    /**
     * Fetches document registry metadata.
     */
    getDocument(companyId: string, documentId: string): Promise<KnowledgeDocument>;
    /**
     * Lists company files with criteria filters.
     */
    listDocuments(companyId: string, options: ListDocumentsOptions): Promise<{
        items: KnowledgeDocument[];
        lastVisibleSnapshot: any;
    }>;
    /**
     * Validates and updates processing lifecycle status of a document.
     */
    updateStatus(companyId: string, documentId: string, newStatus: ProcessingStatus, failureReason?: string): Promise<void>;
    /**
     * Calculates health metrics for monitoring and administrative dashboards.
     */
    calculateDocumentHealth(companyId: string, documentId: string): Promise<DocumentHealthReportDto>;
    /**
     * Performs soft deletion of a document index registry.
     */
    softDeleteDocument(companyId: string, documentId: string): Promise<void>;
    /**
     * Registers a list of lightweight chunk metadata structures.
     */
    registerDocumentChunks(companyId: string, documentId: string, chunks: Omit<KnowledgeChunk, 'companyId' | 'documentId' | 'createdAt'>[]): Promise<void>;
}
export declare const knowledgeIndexService: KnowledgeIndexService;
//# sourceMappingURL=KnowledgeIndexService.d.ts.map