/**
 * Base custom error class for all Google Cloud Storage operations.
 * Preserves the original stack trace.
 */
export declare class StorageError extends Error {
    readonly originalError?: Error;
    readonly code: string;
    constructor(message: string, code: string, originalError?: Error);
}
export declare class StorageInitializationError extends StorageError {
    constructor(message: string, originalError?: Error);
}
export declare class FileNotFoundOrMissingError extends StorageError {
    readonly path: string;
    constructor(path: string, originalError?: Error);
}
export declare class PermissionDeniedStorageError extends StorageError {
    constructor(message: string, originalError?: Error);
}
export declare class BucketNotFoundError extends StorageError {
    readonly bucketName: string;
    constructor(bucketName: string, originalError?: Error);
}
export declare class UploadFailedError extends StorageError {
    constructor(message: string, originalError?: Error);
}
export declare class DownloadFailedError extends StorageError {
    constructor(message: string, originalError?: Error);
}
export declare class FileOperationError extends StorageError {
    constructor(message: string, originalError?: Error);
}
//# sourceMappingURL=storage.errors.d.ts.map