/**
 * Base custom exception for all knowledge indexing failures.
 * Preserves the inner/original cause stack trace if provided.
 */
export declare class KnowledgeError extends Error {
    readonly code: string;
    readonly cause?: Error;
    constructor(message: string, code: string, cause?: Error);
}
export declare class KnowledgeDocumentNotFoundError extends KnowledgeError {
    constructor(documentId: string, cause?: Error);
}
export declare class InvalidStatusTransitionError extends KnowledgeError {
    constructor(from: string, to: string);
}
export declare class InconsistentStateError extends KnowledgeError {
    constructor(message: string, cause?: Error);
}
export declare class CompanyMismatchError extends KnowledgeError {
    constructor(message: string);
}
export declare class DuplicateDocumentError extends KnowledgeError {
    constructor(checksum: string);
}
export declare class PermissionFailureError extends KnowledgeError {
    constructor(message: string);
}
//# sourceMappingURL=knowledge.errors.d.ts.map