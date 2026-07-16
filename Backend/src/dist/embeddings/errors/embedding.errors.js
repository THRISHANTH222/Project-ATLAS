"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingRetryExhaustedError = exports.EmbeddingStorageError = exports.EmbeddingApiError = exports.EmbeddingQuotaError = exports.EmbeddingRateLimitError = exports.EmbeddingAuthError = exports.EmbeddingConfigError = exports.EmbeddingError = void 0;
/**
 * Base custom exception for all embedding generation errors.
 * Preserves the inner/original cause stack trace if provided.
 */
class EmbeddingError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
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
exports.EmbeddingError = EmbeddingError;
class EmbeddingConfigError extends EmbeddingError {
    constructor(message, cause) {
        super(message, 'EMBEDDING_CONFIG_FAILURE', cause);
    }
}
exports.EmbeddingConfigError = EmbeddingConfigError;
class EmbeddingAuthError extends EmbeddingError {
    constructor(message, cause) {
        super(message, 'EMBEDDING_AUTH_FAILURE', cause);
    }
}
exports.EmbeddingAuthError = EmbeddingAuthError;
class EmbeddingRateLimitError extends EmbeddingError {
    constructor(message, cause) {
        super(message, 'EMBEDDING_RATE_LIMIT_EXCEEDED', cause);
    }
}
exports.EmbeddingRateLimitError = EmbeddingRateLimitError;
class EmbeddingQuotaError extends EmbeddingError {
    constructor(message, cause) {
        super(message, 'EMBEDDING_QUOTA_EXCEEDED', cause);
    }
}
exports.EmbeddingQuotaError = EmbeddingQuotaError;
class EmbeddingApiError extends EmbeddingError {
    constructor(message, cause) {
        super(message, 'EMBEDDING_API_FAILURE', cause);
    }
}
exports.EmbeddingApiError = EmbeddingApiError;
class EmbeddingStorageError extends EmbeddingError {
    constructor(message, cause) {
        super(message, 'EMBEDDING_STORAGE_FAILURE', cause);
    }
}
exports.EmbeddingStorageError = EmbeddingStorageError;
class EmbeddingRetryExhaustedError extends EmbeddingError {
    constructor(message, cause) {
        super(message, 'EMBEDDING_RETRY_EXHAUSTED', cause);
    }
}
exports.EmbeddingRetryExhaustedError = EmbeddingRetryExhaustedError;
//# sourceMappingURL=embedding.errors.js.map