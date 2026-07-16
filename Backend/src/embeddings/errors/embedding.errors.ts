/**
 * Base custom exception for all embedding generation errors.
 * Preserves the inner/original cause stack trace if provided.
 */
export class EmbeddingError extends Error {
  public readonly code: string;
  public readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export class EmbeddingConfigError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_CONFIG_FAILURE', cause);
  }
}

export class EmbeddingAuthError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_AUTH_FAILURE', cause);
  }
}

export class EmbeddingRateLimitError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_RATE_LIMIT_EXCEEDED', cause);
  }
}

export class EmbeddingQuotaError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_QUOTA_EXCEEDED', cause);
  }
}

export class EmbeddingApiError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_API_FAILURE', cause);
  }
}

export class EmbeddingStorageError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_STORAGE_FAILURE', cause);
  }
}

export class EmbeddingRetryExhaustedError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_RETRY_EXHAUSTED', cause);
  }
}
