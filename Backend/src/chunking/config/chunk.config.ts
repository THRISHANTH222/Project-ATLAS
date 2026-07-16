import { ChunkingConfig } from '../types/chunk.types';
import { InvalidConfigError } from '../errors/chunk.errors';

/**
 * Parses and validates text chunking configurations from environment variables.
 * Enforces rule relationships (e.g. overlap < size) and fails fast on startup.
 */
export function loadAndValidateConfig(): ChunkingConfig {
  const maxChunkSizeStr = process.env.CHUNK_MAX_SIZE || '1000';
  const chunkOverlapSizeStr = process.env.CHUNK_OVERLAP_SIZE || '200';
  const minChunkSizeStr = process.env.CHUNK_MIN_SIZE || '100';
  const tokenizerStrategyStr = process.env.CHUNK_TOKENIZER_STRATEGY || 'character';

  const maxChunkSize = parseInt(maxChunkSizeStr, 10);
  const chunkOverlapSize = parseInt(chunkOverlapSizeStr, 10);
  const minChunkSize = parseInt(minChunkSizeStr, 10);

  if (isNaN(maxChunkSize) || maxChunkSize <= 0) {
    throw new InvalidConfigError(`CHUNK_MAX_SIZE must be a positive integer. Found: ${maxChunkSizeStr}`);
  }

  if (isNaN(chunkOverlapSize) || chunkOverlapSize < 0) {
    throw new InvalidConfigError(`CHUNK_OVERLAP_SIZE must be a non-negative integer. Found: ${chunkOverlapSizeStr}`);
  }

  if (isNaN(minChunkSize) || minChunkSize <= 0) {
    throw new InvalidConfigError(`CHUNK_MIN_SIZE must be a positive integer. Found: ${minChunkSizeStr}`);
  }

  if (chunkOverlapSize >= maxChunkSize) {
    throw new InvalidConfigError(
      `CHUNK_OVERLAP_SIZE (${chunkOverlapSize}) must be strictly less than CHUNK_MAX_SIZE (${maxChunkSize}).`
    );
  }

  if (minChunkSize > maxChunkSize) {
    throw new InvalidConfigError(
      `CHUNK_MIN_SIZE (${minChunkSize}) must be less than or equal to CHUNK_MAX_SIZE (${maxChunkSize}).`
    );
  }

  const validStrategies = ['character', 'word', 'token'];
  if (!validStrategies.includes(tokenizerStrategyStr)) {
    throw new InvalidConfigError(
      `CHUNK_TOKENIZER_STRATEGY must be one of: ${validStrategies.join(', ')}. Found: ${tokenizerStrategyStr}`
    );
  }

  return {
    maxChunkSize,
    chunkOverlapSize,
    minChunkSize,
    tokenizerStrategy: tokenizerStrategyStr as 'character' | 'word' | 'token',
  };
}

// Global active configuration singleton
export const chunkingConfig = loadAndValidateConfig();
