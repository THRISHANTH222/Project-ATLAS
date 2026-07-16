"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreKnowledgeRepository = void 0;
const firestore_service_1 = require("../../services/firestore.service");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('FirestoreKnowledgeRepository');
/**
 * Concrete Firestore repository implementation for the Knowledge Index catalog.
 */
class FirestoreKnowledgeRepository {
    docService;
    chunkService;
    constructor() {
        this.docService = new firestore_service_1.FirestoreService('knowledge_documents');
        this.chunkService = new firestore_service_1.FirestoreService('knowledge_chunks');
    }
    /**
     * Registers a new document record.
     */
    async createDocument(doc) {
        logger.debug(`Writing document index documentId: ${doc.documentId}`);
        await this.docService.createWithId(doc.documentId, doc);
    }
    /**
     * Resolves document metadata by ID, checking company multi-tenant isolation.
     */
    async getDocument(companyId, documentId) {
        const exists = await this.docService.exists(documentId);
        if (!exists)
            return null;
        const doc = await this.docService.getById(documentId);
        if (doc.companyId !== companyId || doc.deletedAt) {
            return null; // Tenancy boundary or soft deleted
        }
        return doc;
    }
    /**
     * Finds a document with matching checksum hash, ignoring soft-deleted files.
     */
    async getDocumentByChecksum(companyId, checksum) {
        const result = await this.docService.query({
            filters: [
                { field: 'companyId', operator: '==', value: companyId },
                { field: 'checksum', operator: '==', value: checksum },
            ],
            limit: 1,
        });
        const active = result.data.filter(d => !d.deletedAt);
        return active.length > 0 ? active[0] : null;
    }
    /**
     * Modifies catalog document metadata fields.
     */
    async updateDocument(companyId, documentId, updates) {
        const doc = await this.getDocument(companyId, documentId);
        if (!doc) {
            throw new Error(`Document with ID '${documentId}' does not exist or belongs to another company.`);
        }
        await this.docService.update(documentId, updates);
    }
    /**
     * Performs soft deletion, storing the deleted ISO timestamp.
     */
    async softDeleteDocument(companyId, documentId) {
        await this.updateDocument(companyId, documentId, {
            deletedAt: new Date().toISOString(),
        });
    }
    /**
     * Permanently purges a document index registry.
     */
    async hardDeleteDocument(companyId, documentId) {
        const doc = await this.getDocument(companyId, documentId);
        if (!doc) {
            throw new Error(`Document with ID '${documentId}' does not exist or belongs to another company.`);
        }
        await this.docService.delete(documentId);
    }
    /**
     * Lists company files with status/health filters and sorting.
     */
    async listDocuments(companyId, options) {
        const filters = [
            { field: 'companyId', operator: '==', value: companyId },
        ];
        if (options.status) {
            filters.push({ field: 'status', operator: '==', value: options.status });
        }
        if (options.health) {
            filters.push({ field: 'health', operator: '==', value: options.health });
        }
        const orderBy = [];
        if (options.sortBy) {
            orderBy.push({ field: options.sortBy, direction: options.sortDirection || 'asc' });
        }
        else {
            orderBy.push({ field: 'createdAt', direction: 'desc' });
        }
        const result = await this.docService.query({
            filters,
            orderBy,
            limit: options.limit || 50,
            startAfterDoc: options.startAfterDoc,
        });
        let items = result.data;
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
    async registerChunks(chunks) {
        if (!chunks || chunks.length === 0)
            return;
        logger.info(`Persisting ${chunks.length} chunks to catalog...`);
        const limit = 400;
        for (let i = 0; i < chunks.length; i += limit) {
            const slice = chunks.slice(i, i + limit);
            const operations = slice.map(chunk => ({
                type: 'set',
                docId: chunk.chunkId,
                data: chunk,
            }));
            await this.chunkService.executeBatch(operations);
        }
    }
    /**
     * Gathers all registered chunks for a document ordered by index.
     */
    async getDocumentChunks(companyId, documentId) {
        const result = await this.chunkService.query({
            filters: [
                { field: 'companyId', operator: '==', value: companyId },
                { field: 'documentId', operator: '==', value: documentId },
            ],
            orderBy: [{ field: 'chunkIndex', direction: 'asc' }],
        });
        return result.data;
    }
    /**
     * Purges all registered chunks for a document.
     */
    async deleteChunksByDocument(companyId, documentId) {
        const chunks = await this.getDocumentChunks(companyId, documentId);
        if (chunks.length === 0)
            return;
        const limit = 400;
        for (let i = 0; i < chunks.length; i += limit) {
            const slice = chunks.slice(i, i + limit);
            const operations = slice.map(chunk => ({
                type: 'delete',
                docId: chunk.chunkId,
            }));
            await this.chunkService.executeBatch(operations);
        }
    }
}
exports.FirestoreKnowledgeRepository = FirestoreKnowledgeRepository;
//# sourceMappingURL=KnowledgeRepository.js.map