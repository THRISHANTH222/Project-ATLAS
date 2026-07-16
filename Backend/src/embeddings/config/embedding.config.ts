import { EmbeddingConfigError } from '../errors/embedding.errors';

export interface EmbeddingServiceConfig {
  apiKey: string;
  model: string;
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  concurrencyLimit: number;
  storageProvider: string;
}

/**
 * Loads, overrides, and validates embedding configuration options from env.
 * Throws clean ConfigurationError during startup on rule violations.
 */
export function loadAndValidateConfig(): EmbeddingServiceConfig {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-004';
  const batchSizeStr = process.env.EMBEDDING_BATCH_SIZE || '100';
  const maxRetriesStr = process.env.EMBEDDING_RETRY_COUNT || '3';
  const retryDelayMsStr = process.env.EMBEDDING_RETRY_DELAY_MS || '1000';
  const timeoutMsStr = process.env.EMBEDDING_TIMEOUT_MS || '30000';
  const concurrencyStr = process.env.EMBEDDING_CONCURRENCY || '5';
  const storageProvider = process.env.EMBEDDING_STORAGE_PROVIDER || 'firestore';

  // Strict check for API key in production mode
  if (!apiKey && process.env.NODE_ENV === 'production') {
    throw new EmbeddingConfigError(
      'GEMINI_API_KEY or GOOGLE_API_KEY environment variable must be specified in production.'
    );
  }

  const batchSize = parseInt(batchSizeStr, 10);
  const maxRetries = parseInt(maxRetriesStr, 10);
  const retryDelayMs = parseInt(retryDelayMsStr, 10);
  const timeoutMs = parseInt(timeoutMsStr, 10);
  const concurrencyLimit = parseInt(concurrencyStr, 10);

  if (isNaN(batchSize) || batchSize <= 0) {
    throw new EmbeddingConfigError(`EMBEDDING_BATCH_SIZE must be a positive integer. Found: ${batchSizeStr}`);
  }

  if (isNaN(maxRetries) || maxRetries < 0) {
    throw new EmbeddingConfigError(`EMBEDDING_RETRY_COUNT must be a non-negative integer. Found: ${maxRetriesStr}`);
  }

  if (isNaN(retryDelayMs) || retryDelayMs <= 0) {
    throw new EmbeddingConfigError(`EMBEDDING_RETRY_DELAY_MS must be a positive integer. Found: ${retryDelayMsStr}`);
  }

  if (isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new EmbeddingConfigError(`EMBEDDING_TIMEOUT_MS must be a positive integer. Found: ${timeoutMsStr}`);
  }

  if (isNaN(concurrencyLimit) || concurrencyLimit <= 0) {
    throw new EmbeddingConfigError(`EMBEDDING_CONCURRENCY must be a positive integer. Found: ${concurrencyStr}`);
  }

  return {
    apiKey: apiKey || 'mock-gemini-key', // safe fallback for testing
    model,
    batchSize,
    maxRetries,
    retryDelayMs,
    timeoutMs,
    concurrencyLimit,
    storageProvider,
  };
}

export const embeddingConfig = loadAndValidateConfig();
