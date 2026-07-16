/**
 * Base custom error class for all Google Cloud Storage operations.
 * Preserves the original stack trace.
 */
export class StorageError extends Error {
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

export class StorageInitializationError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(message, 'STORAGE_INITIALIZATION_FAILED', originalError);
  }
}

export class FileNotFoundOrMissingError extends StorageError {
  public readonly path: string;

  constructor(path: string, originalError?: Error) {
    super(`File at path '${path}' was not found in storage.`, 'FILE_NOT_FOUND', originalError);
    this.path = path;
  }
}

export class PermissionDeniedStorageError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(message, 'PERMISSION_DENIED', originalError);
  }
}

export class BucketNotFoundError extends StorageError {
  public readonly bucketName: string;

  constructor(bucketName: string, originalError?: Error) {
    super(`Storage bucket '${bucketName}' was not found.`, 'BUCKET_NOT_FOUND', originalError);
    this.bucketName = bucketName;
  }
}

export class UploadFailedError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(message, 'UPLOAD_FAILED', originalError);
  }
}

export class DownloadFailedError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DOWNLOAD_FAILED', originalError);
  }
}

export class FileOperationError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(message, 'FILE_OPERATION_FAILED', originalError);
  }
}
