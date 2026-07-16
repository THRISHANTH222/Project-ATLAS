"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchError = exports.TransactionError = exports.NetworkFailureError = exports.InvalidDataError = exports.PermissionDeniedError = exports.DocumentNotFoundError = exports.FirestoreInitializationError = exports.FirestoreError = void 0;
/**
 * Base custom error class for all Firestore operations.
 * Preserves the original stack trace.
 */
class FirestoreError extends Error {
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
exports.FirestoreError = FirestoreError;
class FirestoreInitializationError extends FirestoreError {
    constructor(message, originalError) {
        super(message, 'INITIALIZATION_FAILED', originalError);
    }
}
exports.FirestoreInitializationError = FirestoreInitializationError;
class DocumentNotFoundError extends FirestoreError {
    collection;
    documentId;
    constructor(collection, documentId, originalError) {
        super(`Document with ID '${documentId}' not found in collection '${collection}'.`, 'DOCUMENT_NOT_FOUND', originalError);
        this.collection = collection;
        this.documentId = documentId;
    }
}
exports.DocumentNotFoundError = DocumentNotFoundError;
class PermissionDeniedError extends FirestoreError {
    constructor(message, originalError) {
        super(message, 'PERMISSION_DENIED', originalError);
    }
}
exports.PermissionDeniedError = PermissionDeniedError;
class InvalidDataError extends FirestoreError {
    constructor(message, originalError) {
        super(message, 'INVALID_DATA', originalError);
    }
}
exports.InvalidDataError = InvalidDataError;
class NetworkFailureError extends FirestoreError {
    constructor(message, originalError) {
        super(message, 'NETWORK_FAILURE', originalError);
    }
}
exports.NetworkFailureError = NetworkFailureError;
class TransactionError extends FirestoreError {
    constructor(message, originalError) {
        super(message, 'TRANSACTION_FAILED', originalError);
    }
}
exports.TransactionError = TransactionError;
class BatchError extends FirestoreError {
    constructor(message, originalError) {
        super(message, 'BATCH_FAILED', originalError);
    }
}
exports.BatchError = BatchError;
//# sourceMappingURL=firestore.errors.js.map