"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeIndexService = exports.KnowledgeIndexService = void 0;
const KnowledgeRepository_1 = require("../repositories/KnowledgeRepository");
const knowledge_types_1 = require("../models/knowledge.types");
const knowledge_errors_1 = require("../errors/knowledge.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('KnowledgeIndexService');
const VALID_TRANSITIONS = {
    [knowledge_types_1.ProcessingStatus.UPLOADED]: [knowledge_types_1.ProcessingStatus.PARSING, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.PARSING]: [knowledge_types_1.ProcessingStatus.PARSED, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.PARSED]: [knowledge_types_1.ProcessingStatus.CHUNKING, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.CHUNKING]: [knowledge_types_1.ProcessingStatus.CHUNKED, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.CHUNKED]: [knowledge_types_1.ProcessingStatus.EMBEDDING, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.EMBEDDING]: [knowledge_types_1.ProcessingStatus.EMBEDDED, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.EMBEDDED]: [knowledge_types_1.ProcessingStatus.INDEXING, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.INDEXING]: [knowledge_types_1.ProcessingStatus.COMPLETED, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.COMPLETED]: [knowledge_types_1.ProcessingStatus.ARCHIVED, knowledge_types_1.ProcessingStatus.FAILED],
    [knowledge_types_1.ProcessingStatus.FAILED]: [
        knowledge_types_1.ProcessingStatus.PARSING,
        knowledge_types_1.ProcessingStatus.CHUNKING,
        knowledge_types_1.ProcessingStatus.EMBEDDING,
        knowledge_types_1.ProcessingStatus.ARCHIVED,
    ],
    [knowledge_types_1.ProcessingStatus.ARCHIVED]: [knowledge_types_1.ProcessingStatus.COMPLETED],
};
/**
 * Service managing document catalog indices, chunk metadata registers,
 * and computed document health indicators.
 */
class KnowledgeIndexService {
    repository;
    /**
     * Initializes KnowledgeIndexService.
     * Supports injecting alternative storage repositories for clean test setups.
     */
    constructor(repository) {
        this.repository = repository || new KnowledgeRepository_1.FirestoreKnowledgeRepository();
    }
    /**
     * Registers a processed document inside the catalog index.
     * Prevents duplicates by verifying content checksum hash.
     */
    async registerDocument(companyId, documentId, dto) {
        logger.info(`Registering document metadata: ${documentId} for company: ${companyId}`);
        // Check duplicate content hashes
        const existing = await this.repository.getDocumentByChecksum(companyId, dto.checksum);
        if (existing) {
            logger.warn(`Duplicate content detected. Checksum: ${dto.checksum}`);
            throw new knowledge_errors_1.DuplicateDocumentError(dto.checksum);
        }
        const timestamp = new Date().toISOString();
        const doc = {
            ...dto,
            documentId,
            companyId,
            uploadTimestamp: timestamp,
            health: knowledge_types_1.HealthStatus.HEALTHY,
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
    async getDocument(companyId, documentId) {
        const doc = await this.repository.getDocument(companyId, documentId);
        if (!doc) {
            throw new knowledge_errors_1.KnowledgeDocumentNotFoundError(documentId);
        }
        return doc;
    }
    /**
     * Lists company files with criteria filters.
     */
    async listDocuments(companyId, options) {
        return this.repository.listDocuments(companyId, options);
    }
    /**
     * Validates and updates processing lifecycle status of a document.
     */
    async updateStatus(companyId, documentId, newStatus, failureReason) {
        const doc = await this.getDocument(companyId, documentId);
        // Enforce transition limits
        const allowed = VALID_TRANSITIONS[doc.status];
        if (!allowed || !allowed.includes(newStatus)) {
            throw new knowledge_errors_1.InvalidStatusTransitionError(doc.status, newStatus);
        }
        const updates = {
            status: newStatus,
            updatedAt: new Date().toISOString(),
        };
        if (failureReason) {
            updates.failureReason = failureReason;
            updates.health = knowledge_types_1.HealthStatus.ERROR;
        }
        // Adjust processing duration on completion
        if (newStatus === knowledge_types_1.ProcessingStatus.COMPLETED) {
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
    async calculateDocumentHealth(companyId, documentId) {
        const doc = await this.getDocument(companyId, documentId);
        const issues = [];
        let health = knowledge_types_1.HealthStatus.HEALTHY;
        // Check status
        if (doc.status === knowledge_types_1.ProcessingStatus.FAILED) {
            health = knowledge_types_1.HealthStatus.ERROR;
            issues.push(`Document processing failed: ${doc.failureReason || 'Reason unspecified'}`);
        }
        // Check embedding alignment
        if (doc.status === knowledge_types_1.ProcessingStatus.COMPLETED) {
            if (doc.totalChunks !== doc.totalEmbeddings) {
                health = knowledge_types_1.HealthStatus.WARNING;
                issues.push(`Embedding mismatch. Metadata lists ${doc.totalChunks} chunks but only ${doc.totalEmbeddings} vectors.`);
            }
        }
        // Check chunk list size consistency
        const chunks = await this.repository.getDocumentChunks(companyId, documentId);
        if (doc.status !== knowledge_types_1.ProcessingStatus.UPLOADED && doc.status !== knowledge_types_1.ProcessingStatus.PARSING) {
            if (chunks.length !== doc.totalChunks) {
                health = knowledge_types_1.HealthStatus.WARNING;
                issues.push(`Chunk registry mismatch. Metadata lists ${doc.totalChunks} chunks but found ${chunks.length} records.`);
            }
        }
        if (issues.length > 0 && health === knowledge_types_1.HealthStatus.HEALTHY) {
            health = knowledge_types_1.HealthStatus.WARNING;
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
    async softDeleteDocument(companyId, documentId) {
        logger.info(`Logical delete document: ${documentId} for company: ${companyId}`);
        await this.repository.softDeleteDocument(companyId, documentId);
    }
    /**
     * Registers a list of lightweight chunk metadata structures.
     */
    async registerDocumentChunks(companyId, documentId, chunks) {
        const doc = await this.getDocument(companyId, documentId);
        const createdAt = new Date().toISOString();
        const records = chunks.map(c => ({
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
exports.KnowledgeIndexService = KnowledgeIndexService;
exports.knowledgeIndexService = new KnowledgeIndexService();
//# sourceMappingURL=KnowledgeIndexService.js.map