/**
 * Base custom exception for all text chunking errors.
 * Preserves the inner/original cause stack trace if provided.
 */
export declare class ChunkingError extends Error {
    readonly code: string;
    readonly cause?: Error;
    constructor(message: string, code: string, cause?: Error);
}
export declare class EmptyInputError extends ChunkingError {
    constructor(message: string, cause?: Error);
}
export declare class InvalidConfigError extends ChunkingError {
    constructor(message: string, cause?: Error);
}
export declare class ProcessingError extends ChunkingError {
    constructor(message: string, cause?: Error);
}
//# sourceMappingURL=chunk.errors.d.ts.map