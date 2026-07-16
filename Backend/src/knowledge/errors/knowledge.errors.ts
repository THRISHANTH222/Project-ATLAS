/**
 * Base custom exception for all knowledge indexing failures.
 * Preserves the inner/original cause stack trace if provided.
 */
export class KnowledgeError extends Error {
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

export class KnowledgeDocumentNotFoundError extends KnowledgeError {
  constructor(documentId: string, cause?: Error) {
    super(`Document with ID '${documentId}' was not found.`, 'DOCUMENT_NOT_FOUND', cause);
  }
}

export class InvalidStatusTransitionError extends KnowledgeError {
  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition from state '${from}' to '${to}'.`, 'INVALID_STATUS_TRANSITION');
  }
}

export class InconsistentStateError extends KnowledgeError {
  constructor(message: string, cause?: Error) {
    super(message, 'INCONSISTENT_STATE', cause);
  }
}

export class CompanyMismatchError extends KnowledgeError {
  constructor(message: string) {
    super(message, 'TENANT_COMPANY_MISMATCH');
  }
}

export class DuplicateDocumentError extends KnowledgeError {
  constructor(checksum: string) {
    super(`A document matching content checksum '${checksum}' already exists.`, 'DUPLICATE_DOCUMENT');
  }
}

export class PermissionFailureError extends KnowledgeError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED');
  }
}
