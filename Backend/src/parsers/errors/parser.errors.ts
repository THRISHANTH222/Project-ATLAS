/**
 * Base custom exception for all document parsing errors.
 * Preserves the inner/original cause stack trace if provided.
 */
export class ParserError extends Error {
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

export class UnsupportedFileTypeError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'UNSUPPORTED_FILE_TYPE', cause);
  }
}

export class CorruptedFileError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'CORRUPTED_FILE', cause);
  }
}

export class EmptyDocumentError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMPTY_DOCUMENT', cause);
  }
}

export class InvalidFileError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'INVALID_FILE', cause);
  }
}

export class MissingParserError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'MISSING_PARSER', cause);
  }
}

export class ParseTimeoutError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'PARSE_TIMEOUT', cause);
  }
}

export class ReadFailureError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'READ_FAILURE', cause);
  }
}

export class PermissionDeniedParserError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'PERMISSION_DENIED', cause);
  }
}

export class InvalidMimeTypeError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'INVALID_MIME_TYPE', cause);
  }
}

export class InvalidExtensionError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'INVALID_EXTENSION', cause);
  }
}

export class InvalidBufferError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'INVALID_BUFFER', cause);
  }
}

export class UnexpectedParserError extends ParserError {
  constructor(message: string, cause?: Error) {
    super(message, 'UNEXPECTED_PARSER_FAILURE', cause);
  }
}
