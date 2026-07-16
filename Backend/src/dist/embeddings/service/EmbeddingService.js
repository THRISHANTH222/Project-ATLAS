"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingService = exports.EmbeddingService = void 0;
const EmbeddingProviderFactory_1 = require("../factory/EmbeddingProviderFactory");
const FirestoreEmbeddingRepository_1 = require("../repository/FirestoreEmbeddingRepository");
const embedding_types_1 = require("../models/embedding.types");
const embedding_config_1 = require("../config/embedding.config");
const batching_1 = require("../utils/batching");
const retry_1 = require("../utils/retry");
const embedding_errors_1 = require("../errors/embedding.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('EmbeddingService');
/**
 * Service orchestrating vector embedding pipelines.
 * Manages document tracking lifecycle states, API call partitioning, and storage writes.
 */
class EmbeddingService {
    provider;
    repository;
    config;
    /**
     * Initializes the EmbeddingService. Supports dependency injection.
     */
    constructor(provider, repository, configOverride) {
        this.config = {
            apiKey: configOverride?.apiKey ?? embedding_config_1.embeddingConfig.apiKey,
            model: configOverride?.model ?? embedding_config_1.embeddingConfig.model,
            batchSize: configOverride?.batchSize ?? embedding_config_1.embeddingConfig.batchSize,
            maxRetries: configOverride?.maxRetries ?? embedding_config_1.embeddingConfig.maxRetries,
            retryDelayMs: configOverride?.retryDelayMs ?? embedding_config_1.embeddingConfig.retryDelayMs,
            timeoutMs: configOverride?.timeoutMs ?? embedding_config_1.embeddingConfig.timeoutMs,
            concurrencyLimit: configOverride?.concurrencyLimit ?? embedding_config_1.embeddingConfig.concurrencyLimit,
            storageProvider: configOverride?.storageProvider ?? embedding_config_1.embeddingConfig.storageProvider,
        };
        this.provider = provider || EmbeddingProviderFactory_1.EmbeddingProviderFactory.getProvider();
        this.repository = repository || new FirestoreEmbeddingRepository_1.FirestoreEmbeddingRepository();
    }
    /**
     * Generates and persists embeddings for a list of text chunks.
     * Tracks document jobs from Pending -> Processing -> Completed.
     * @param companyId Tenant identifier.
     * @param documentId Document unique identifier.
     * @param chunks Array of parsed document chunks.
     * @param filename Document filename.
     * @param parserSource Document parsing strategy used.
     */
    async embedChunks(companyId, documentId, chunks, filename, parserSource) {
        const startTime = Date.now();
        logger.info(`Starting embedding generation process...`, {
            companyId,
            documentId,
            chunkCount: chunks?.length,
        });
        if (!companyId || !documentId) {
            throw new embedding_errors_1.EmbeddingConfigError('CompanyId and DocumentId are required parameters.');
        }
        if (!chunks || chunks.length === 0) {
            throw new embedding_errors_1.EmbeddingConfigError('Text chunks list cannot be empty, null, or undefined.');
        }
        // 1. Initialize tracking lifecycle status
        await this.repository.updateStatus(companyId, documentId, embedding_types_1.EmbeddingStatus.PENDING);
        await this.repository.updateStatus(companyId, documentId, embedding_types_1.EmbeddingStatus.PROCESSING);
        try {
            const recordsToStore = [];
            const chunkBatches = batching_1.Batching.slice(chunks, this.config.batchSize);
            const dimensions = this.provider.getDimensions();
            const modelName = this.config.model;
            const createdAt = new Date().toISOString();
            // 2. Process chunk partitions sequentially
            for (let b = 0; b < chunkBatches.length; b++) {
                const batch = chunkBatches[b];
                logger.info(`Processing batch ${b + 1}/${chunkBatches.length}...`, { size: batch.length });
                const texts = batch.map(c => {
                    if (!c.content || c.content.trim().length === 0) {
                        throw new embedding_errors_1.EmbeddingConfigError(`Chunk content at index ${c.metadata.chunkIndex} is empty.`);
                    }
                    return c.content;
                });
                // 3. Generate vectors using exponential retry wrapper
                let vectors;
                try {
                    vectors = await (0, retry_1.retryWithBackoff)(() => this.provider.generateEmbeddings(texts), {
                        maxRetries: this.config.maxRetries,
                        initialDelayMs: this.config.retryDelayMs,
                        shouldRetry: (err) => {
                            // Instantly fail and abort on non-transient config/auth exceptions
                            return !(err instanceof embedding_errors_1.EmbeddingAuthError) && !(err instanceof embedding_errors_1.EmbeddingConfigError);
                        },
                    });
                }
                catch (apiError) {
                    const detail = apiError.message || String(apiError);
                    throw new embedding_errors_1.EmbeddingRetryExhaustedError(`Failed to generate embeddings after ${this.config.maxRetries} retry attempts. Cause: ${detail}`, apiError);
                }
                if (vectors.length !== batch.length) {
                    throw new embedding_errors_1.EmbeddingApiError(`Vector alignment mismatch. Received ${vectors.length} vectors for ${batch.length} chunks.`);
                }
                // 4. Map vector results to database records
                const batchRecords = batch.map((chunk, idx) => {
                    const embeddingId = `${companyId}-${documentId}-${chunk.chunkId}`;
                    const vector = vectors[idx];
                    const metadata = {
                        embeddingId,
                        companyId,
                        documentId,
                        chunkId: chunk.chunkId,
                        chunkIndex: chunk.metadata.chunkIndex,
                        embeddingModel: modelName,
                        embeddingDimensions: dimensions,
                        filename,
                        parserSource,
                        chunkMetadata: chunk.metadata,
                        createdAt,
                        status: embedding_types_1.EmbeddingStatus.COMPLETED,
                    };
                    return {
                        embeddingId,
                        companyId,
                        documentId,
                        chunkId: chunk.chunkId,
                        chunkIndex: chunk.metadata.chunkIndex,
                        embeddingVector: vector,
                        metadata,
                    };
                });
                recordsToStore.push(...batchRecords);
            }
            // 5. Commit embeddings via storage repository
            await this.repository.saveMany(recordsToStore);
            // 6. Complete status tracking
            await this.repository.updateStatus(companyId, documentId, embedding_types_1.EmbeddingStatus.COMPLETED);
            const durationMs = Date.now() - startTime;
            logger.info('Embedding generation and persistence process completed successfully.', {
                durationMs,
                documentId,
                totalEmbeddings: recordsToStore.length,
            });
            return recordsToStore;
        }
        catch (error) {
            const errMsg = error.message || String(error);
            logger.error(`Embedding generation process aborted for document '${documentId}'.`, error);
            // Update lifecycle tracker registry to Failed
            await this.repository.updateStatus(companyId, documentId, embedding_types_1.EmbeddingStatus.FAILED, errMsg);
            if (error instanceof embedding_errors_1.EmbeddingError) {
                throw error;
            }
            throw new embedding_errors_1.EmbeddingApiError('Unexpected error occurred during embedding processing.', error);
        }
    }
}
exports.EmbeddingService = EmbeddingService;
exports.embeddingService = new EmbeddingService();
//# sourceMappingURL=EmbeddingService.js.map