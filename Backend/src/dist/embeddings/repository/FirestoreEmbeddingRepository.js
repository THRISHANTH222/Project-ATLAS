"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreEmbeddingRepository = void 0;
const firestore_service_1 = require("../../services/firestore.service");
const embedding_errors_1 = require("../errors/embedding.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('FirestoreEmbeddingRepository');
/**
 * Firestore implementation of EmbeddingRepository using the project's existing services.
 * Keeps collections decoupled and isolated.
 */
class FirestoreEmbeddingRepository {
    embeddingService;
    statusService;
    constructor() {
        this.embeddingService = new firestore_service_1.FirestoreService('embeddings');
        this.statusService = new firestore_service_1.FirestoreService('embedding_jobs');
    }
    /**
     * Persists a single embedding record to Firestore.
     */
    async saveEmbedding(record) {
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
        }
        catch (error) {
            throw new embedding_errors_1.EmbeddingStorageError(`Failed to save embedding ID '${record.embeddingId}' to database.`, error);
        }
    }
    /**
     * Persists multiple embedding records in atomic batches of 400.
     */
    async saveMany(records) {
        if (!records || records.length === 0)
            return;
        try {
            logger.info(`Saving ${records.length} embeddings to database...`);
            const limit = 400; // Keep under 500 operations Firestore limit
            for (let i = 0; i < records.length; i += limit) {
                const slice = records.slice(i, i + limit);
                const operations = slice.map(record => ({
                    type: 'set',
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
        }
        catch (error) {
            throw new embedding_errors_1.EmbeddingStorageError('Failed to execute batch insert in database.', error);
        }
    }
    /**
     * Creates or updates the status job registry of document processing.
     */
    async updateStatus(companyId, documentId, status, failureReason) {
        try {
            logger.info(`Setting document job '${documentId}' status: ${status}`);
            const jobData = {
                companyId,
                documentId,
                status,
                updatedAt: new Date().toISOString(),
            };
            if (failureReason) {
                jobData.failureReason = failureReason;
            }
            await this.statusService.createWithId(documentId, jobData);
        }
        catch (error) {
            throw new embedding_errors_1.EmbeddingStorageError(`Failed to write status metadata for document ID '${documentId}'.`, error);
        }
    }
    /**
     * Purges all chunk vectors and status metadata connected to a document ID.
     */
    async deleteByDocument(companyId, documentId) {
        try {
            logger.info(`Deleting database vectors linked to document: ${documentId}`);
            const list = await this.getDocumentEmbeddings(companyId, documentId);
            if (list.length > 0) {
                const limit = 400;
                for (let i = 0; i < list.length; i += limit) {
                    const slice = list.slice(i, i + limit);
                    const operations = slice.map(record => ({
                        type: 'delete',
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
        }
        catch (error) {
            throw new embedding_errors_1.EmbeddingStorageError(`Failed to delete database records for document ID '${documentId}'.`, error);
        }
    }
    /**
     * Retrieves a single embedding record. Validates company bounds.
     */
    async getEmbedding(companyId, embeddingId) {
        try {
            const exists = await this.embeddingService.exists(embeddingId);
            if (!exists)
                return null;
            const record = await this.embeddingService.getById(embeddingId);
            if (record.companyId !== companyId) {
                return null; // Tenancy partition safety check
            }
            return record;
        }
        catch (error) {
            throw new embedding_errors_1.EmbeddingStorageError(`Failed to fetch embedding ID '${embeddingId}'.`, error);
        }
    }
    /**
     * Retrieves all vectors associated with a document ID.
     */
    async getDocumentEmbeddings(companyId, documentId) {
        try {
            const res = await this.embeddingService.query({
                filters: [
                    { field: 'companyId', operator: '==', value: companyId },
                    { field: 'documentId', operator: '==', value: documentId },
                ],
            });
            return res.data;
        }
        catch (error) {
            throw new embedding_errors_1.EmbeddingStorageError(`Failed to retrieve vectors list for document ID '${documentId}'.`, error);
        }
    }
}
exports.FirestoreEmbeddingRepository = FirestoreEmbeddingRepository;
//# sourceMappingURL=FirestoreEmbeddingRepository.js.map