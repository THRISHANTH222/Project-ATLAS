"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkingConfig = void 0;
exports.loadAndValidateConfig = loadAndValidateConfig;
const chunk_errors_1 = require("../errors/chunk.errors");
/**
 * Parses and validates text chunking configurations from environment variables.
 * Enforces rule relationships (e.g. overlap < size) and fails fast on startup.
 */
function loadAndValidateConfig() {
    const maxChunkSizeStr = process.env.CHUNK_MAX_SIZE || '1000';
    const chunkOverlapSizeStr = process.env.CHUNK_OVERLAP_SIZE || '200';
    const minChunkSizeStr = process.env.CHUNK_MIN_SIZE || '100';
    const tokenizerStrategyStr = process.env.CHUNK_TOKENIZER_STRATEGY || 'character';
    const maxChunkSize = parseInt(maxChunkSizeStr, 10);
    const chunkOverlapSize = parseInt(chunkOverlapSizeStr, 10);
    const minChunkSize = parseInt(minChunkSizeStr, 10);
    if (isNaN(maxChunkSize) || maxChunkSize <= 0) {
        throw new chunk_errors_1.InvalidConfigError(`CHUNK_MAX_SIZE must be a positive integer. Found: ${maxChunkSizeStr}`);
    }
    if (isNaN(chunkOverlapSize) || chunkOverlapSize < 0) {
        throw new chunk_errors_1.InvalidConfigError(`CHUNK_OVERLAP_SIZE must be a non-negative integer. Found: ${chunkOverlapSizeStr}`);
    }
    if (isNaN(minChunkSize) || minChunkSize <= 0) {
        throw new chunk_errors_1.InvalidConfigError(`CHUNK_MIN_SIZE must be a positive integer. Found: ${minChunkSizeStr}`);
    }
    if (chunkOverlapSize >= maxChunkSize) {
        throw new chunk_errors_1.InvalidConfigError(`CHUNK_OVERLAP_SIZE (${chunkOverlapSize}) must be strictly less than CHUNK_MAX_SIZE (${maxChunkSize}).`);
    }
    if (minChunkSize > maxChunkSize) {
        throw new chunk_errors_1.InvalidConfigError(`CHUNK_MIN_SIZE (${minChunkSize}) must be less than or equal to CHUNK_MAX_SIZE (${maxChunkSize}).`);
    }
    const validStrategies = ['character', 'word', 'token'];
    if (!validStrategies.includes(tokenizerStrategyStr)) {
        throw new chunk_errors_1.InvalidConfigError(`CHUNK_TOKENIZER_STRATEGY must be one of: ${validStrategies.join(', ')}. Found: ${tokenizerStrategyStr}`);
    }
    return {
        maxChunkSize,
        chunkOverlapSize,
        minChunkSize,
        tokenizerStrategy: tokenizerStrategyStr,
    };
}
// Global active configuration singleton
exports.chunkingConfig = loadAndValidateConfig();
//# sourceMappingURL=chunk.config.js.map