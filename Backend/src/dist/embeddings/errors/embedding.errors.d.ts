/**
 * Base custom exception for all embedding generation errors.
 * Preserves the inner/original cause stack trace if provided.
 */
export declare class EmbeddingError extends Error {
    readonly code: string;
    readonly cause?: Error;
    constructor(message: string, code: string, cause?: Error);
}
export declare class EmbeddingConfigError extends EmbeddingError {
    constructor(message: string, cause?: Error);
}
export declare class EmbeddingAuthError extends EmbeddingError {
    constructor(message: string, cause?: Error);
}
export declare class EmbeddingRateLimitError extends EmbeddingError {
    constructor(message: string, cause?: Error);
}
export declare class EmbeddingQuotaError extends EmbeddingError {
    constructor(message: string, cause?: Error);
}
export declare class EmbeddingApiError extends EmbeddingError {
    constructor(message: string, cause?: Error);
}
export declare class EmbeddingStorageError extends EmbeddingError {
    constructor(message: string, cause?: Error);
}
export declare class EmbeddingRetryExhaustedError extends EmbeddingError {
    constructor(message: string, cause?: Error);
}
//# sourceMappingURL=embedding.errors.d.ts.map