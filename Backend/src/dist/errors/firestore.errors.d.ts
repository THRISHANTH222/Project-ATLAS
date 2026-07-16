/**
 * Base custom error class for all Firestore operations.
 * Preserves the original stack trace.
 */
export declare class FirestoreError extends Error {
    readonly originalError?: Error;
    readonly code: string;
    constructor(message: string, code: string, originalError?: Error);
}
export declare class FirestoreInitializationError extends FirestoreError {
    constructor(message: string, originalError?: Error);
}
export declare class DocumentNotFoundError extends FirestoreError {
    readonly collection: string;
    readonly documentId: string;
    constructor(collection: string, documentId: string, originalError?: Error);
}
export declare class PermissionDeniedError extends FirestoreError {
    constructor(message: string, originalError?: Error);
}
export declare class InvalidDataError extends FirestoreError {
    constructor(message: string, originalError?: Error);
}
export declare class NetworkFailureError extends FirestoreError {
    constructor(message: string, originalError?: Error);
}
export declare class TransactionError extends FirestoreError {
    constructor(message: string, originalError?: Error);
}
export declare class BatchError extends FirestoreError {
    constructor(message: string, originalError?: Error);
}
//# sourceMappingURL=firestore.errors.d.ts.map