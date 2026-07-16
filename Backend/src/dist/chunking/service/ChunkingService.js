"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkingService = exports.ChunkingService = void 0;
const SentenceChunker_1 = require("../strategies/SentenceChunker");
const chunk_config_1 = require("../config/chunk.config");
const chunk_errors_1 = require("../errors/chunk.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('ChunkingService');
/**
 * Service coordinating document chunking operations.
 * Supports partial parameter overrides and wraps timings and structural logs.
 */
class ChunkingService {
    chunker;
    /**
     * Initializes ChunkingService.
     * Supports injecting alternative strategies to follow Dependency Injection (DI) principles.
     * @param chunker Optional chunking strategy. Defaults to SentenceChunker.
     */
    constructor(chunker) {
        this.chunker = chunker || new SentenceChunker_1.SentenceChunker();
    }
    /**
     * Slices raw text content into standard chunks.
     * @param text Raw document text.
     * @param configOverride Custom override rules.
     * @param contextOptional Extra descriptor columns for chunk metadata context.
     * @throws EmptyInputError if text is invalid.
     */
    chunkText(text, configOverride, contextOptional) {
        const startTime = Date.now();
        // Resolve final configurations merging overrides with global settings
        const config = {
            maxChunkSize: configOverride?.maxChunkSize ?? chunk_config_1.chunkingConfig.maxChunkSize,
            chunkOverlapSize: configOverride?.chunkOverlapSize ?? chunk_config_1.chunkingConfig.chunkOverlapSize,
            minChunkSize: configOverride?.minChunkSize ?? chunk_config_1.chunkingConfig.minChunkSize,
            tokenizerStrategy: configOverride?.tokenizerStrategy ?? chunk_config_1.chunkingConfig.tokenizerStrategy,
        };
        logger.info('Text chunking execution started...', {
            maxChunkSize: config.maxChunkSize,
            overlapSize: config.chunkOverlapSize,
            tokenizer: config.tokenizerStrategy,
            documentId: contextOptional?.documentId,
        });
        if (!text || text.trim().length === 0) {
            logger.error('Aborting chunking. Input text content is empty.');
            throw new chunk_errors_1.EmptyInputError('Text body content must not be null, empty, or undefined.');
        }
        try {
            const chunks = this.chunker.chunk(text, config, contextOptional);
            const durationMs = Date.now() - startTime;
            logger.info('Text chunking completed successfully.', {
                totalChunks: chunks.length,
                durationMs,
                documentId: contextOptional?.documentId,
            });
            return chunks;
        }
        catch (error) {
            logger.error('Failed to complete text chunking operation.', error);
            throw error;
        }
    }
}
exports.ChunkingService = ChunkingService;
// Global active chunking service singleton
exports.chunkingService = new ChunkingService();
//# sourceMappingURL=ChunkingService.js.map