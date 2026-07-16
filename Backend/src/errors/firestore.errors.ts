/**
 * Base custom error class for all Firestore operations.
 * Preserves the original stack trace.
 */
export class FirestoreError extends Error {
  public readonly originalError?: Error;
  public readonly code: string;

  constructor(message: string, code: string, originalError?: Error) {
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

export class FirestoreInitializationError extends FirestoreError {
  constructor(message: string, originalError?: Error) {
    super(message, 'INITIALIZATION_FAILED', originalError);
  }
}

export class DocumentNotFoundError extends FirestoreError {
  public readonly collection: string;
  public readonly documentId: string;

  constructor(collection: string, documentId: string, originalError?: Error) {
    super(
      `Document with ID '${documentId}' not found in collection '${collection}'.`,
      'DOCUMENT_NOT_FOUND',
      originalError
    );
    this.collection = collection;
    this.documentId = documentId;
  }
}

export class PermissionDeniedError extends FirestoreError {
  constructor(message: string, originalError?: Error) {
    super(message, 'PERMISSION_DENIED', originalError);
  }
}

export class InvalidDataError extends FirestoreError {
  constructor(message: string, originalError?: Error) {
    super(message, 'INVALID_DATA', originalError);
  }
}

export class NetworkFailureError extends FirestoreError {
  constructor(message: string, originalError?: Error) {
    super(message, 'NETWORK_FAILURE', originalError);
  }
}

export class TransactionError extends FirestoreError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TRANSACTION_FAILED', originalError);
  }
}

export class BatchError extends FirestoreError {
  constructor(message: string, originalError?: Error) {
    super(message, 'BATCH_FAILED', originalError);
  }
}
