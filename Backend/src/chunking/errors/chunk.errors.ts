/**
 * Base custom exception for all text chunking errors.
 * Preserves the inner/original cause stack trace if provided.
 */
export class ChunkingError extends Error {
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

export class EmptyInputError extends ChunkingError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMPTY_INPUT', cause);
  }
}

export class InvalidConfigError extends ChunkingError {
  constructor(message: string, cause?: Error) {
    super(message, 'INVALID_CONFIGURATION', cause);
  }
}

export class ProcessingError extends ChunkingError {
  constructor(message: string, cause?: Error) {
    super(message, 'PROCESSING_FAILURE', cause);
  }
}
