"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionFailureError = exports.DuplicateDocumentError = exports.CompanyMismatchError = exports.InconsistentStateError = exports.InvalidStatusTransitionError = exports.KnowledgeDocumentNotFoundError = exports.KnowledgeError = void 0;
/**
 * Base custom exception for all knowledge indexing failures.
 * Preserves the inner/original cause stack trace if provided.
 */
class KnowledgeError extends Error {
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
exports.KnowledgeError = KnowledgeError;
class KnowledgeDocumentNotFoundError extends KnowledgeError {
    constructor(documentId, cause) {
        super(`Document with ID '${documentId}' was not found.`, 'DOCUMENT_NOT_FOUND', cause);
    }
}
exports.KnowledgeDocumentNotFoundError = KnowledgeDocumentNotFoundError;
class InvalidStatusTransitionError extends KnowledgeError {
    constructor(from, to) {
        super(`Invalid lifecycle transition from state '${from}' to '${to}'.`, 'INVALID_STATUS_TRANSITION');
    }
}
exports.InvalidStatusTransitionError = InvalidStatusTransitionError;
class InconsistentStateError extends KnowledgeError {
    constructor(message, cause) {
        super(message, 'INCONSISTENT_STATE', cause);
    }
}
exports.InconsistentStateError = InconsistentStateError;
class CompanyMismatchError extends KnowledgeError {
    constructor(message) {
        super(message, 'TENANT_COMPANY_MISMATCH');
    }
}
exports.CompanyMismatchError = CompanyMismatchError;
class DuplicateDocumentError extends KnowledgeError {
    constructor(checksum) {
        super(`A document matching content checksum '${checksum}' already exists.`, 'DUPLICATE_DOCUMENT');
    }
}
exports.DuplicateDocumentError = DuplicateDocumentError;
class PermissionFailureError extends KnowledgeError {
    constructor(message) {
        super(message, 'PERMISSION_DENIED');
    }
}
exports.PermissionFailureError = PermissionFailureError;
//# sourceMappingURL=knowledge.errors.js.map