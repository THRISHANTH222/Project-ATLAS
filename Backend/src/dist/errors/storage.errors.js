"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileOperationError = exports.DownloadFailedError = exports.UploadFailedError = exports.BucketNotFoundError = exports.PermissionDeniedStorageError = exports.FileNotFoundOrMissingError = exports.StorageInitializationError = exports.StorageError = void 0;
/**
 * Base custom error class for all Google Cloud Storage operations.
 * Preserves the original stack trace.
 */
class StorageError extends Error {
    originalError;
    code;
    constructor(message, code, originalError) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.originalError = originalError;
        // Restore prototype chain for ES5 compatibility
        Object.setPrototypeOf(this, new.target.prototype);
        if (originalError && originalError.stack) {
            this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
        }
    }
}
exports.StorageError = StorageError;
class StorageInitializationError extends StorageError {
    constructor(message, originalError) {
        super(message, 'STORAGE_INITIALIZATION_FAILED', originalError);
    }
}
exports.StorageInitializationError = StorageInitializationError;
class FileNotFoundOrMissingError extends StorageError {
    path;
    constructor(path, originalError) {
        super(`File at path '${path}' was not found in storage.`, 'FILE_NOT_FOUND', originalError);
        this.path = path;
    }
}
exports.FileNotFoundOrMissingError = FileNotFoundOrMissingError;
class PermissionDeniedStorageError extends StorageError {
    constructor(message, originalError) {
        super(message, 'PERMISSION_DENIED', originalError);
    }
}
exports.PermissionDeniedStorageError = PermissionDeniedStorageError;
class BucketNotFoundError extends StorageError {
    bucketName;
    constructor(bucketName, originalError) {
        super(`Storage bucket '${bucketName}' was not found.`, 'BUCKET_NOT_FOUND', originalError);
        this.bucketName = bucketName;
    }
}
exports.BucketNotFoundError = BucketNotFoundError;
class UploadFailedError extends StorageError {
    constructor(message, originalError) {
        super(message, 'UPLOAD_FAILED', originalError);
    }
}
exports.UploadFailedError = UploadFailedError;
class DownloadFailedError extends StorageError {
    constructor(message, originalError) {
        super(message, 'DOWNLOAD_FAILED', originalError);
    }
}
exports.DownloadFailedError = DownloadFailedError;
class FileOperationError extends StorageError {
    constructor(message, originalError) {
        super(message, 'FILE_OPERATION_FAILED', originalError);
    }
}
exports.FileOperationError = FileOperationError;
//# sourceMappingURL=storage.errors.js.map