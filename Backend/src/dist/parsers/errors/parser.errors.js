"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnexpectedParserError = exports.InvalidBufferError = exports.InvalidExtensionError = exports.InvalidMimeTypeError = exports.PermissionDeniedParserError = exports.ReadFailureError = exports.ParseTimeoutError = exports.MissingParserError = exports.InvalidFileError = exports.EmptyDocumentError = exports.CorruptedFileError = exports.UnsupportedFileTypeError = exports.ParserError = void 0;
/**
 * Base custom exception for all document parsing errors.
 * Preserves the inner/original cause stack trace if provided.
 */
class ParserError extends Error {
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
exports.ParserError = ParserError;
class UnsupportedFileTypeError extends ParserError {
    constructor(message, cause) {
        super(message, 'UNSUPPORTED_FILE_TYPE', cause);
    }
}
exports.UnsupportedFileTypeError = UnsupportedFileTypeError;
class CorruptedFileError extends ParserError {
    constructor(message, cause) {
        super(message, 'CORRUPTED_FILE', cause);
    }
}
exports.CorruptedFileError = CorruptedFileError;
class EmptyDocumentError extends ParserError {
    constructor(message, cause) {
        super(message, 'EMPTY_DOCUMENT', cause);
    }
}
exports.EmptyDocumentError = EmptyDocumentError;
class InvalidFileError extends ParserError {
    constructor(message, cause) {
        super(message, 'INVALID_FILE', cause);
    }
}
exports.InvalidFileError = InvalidFileError;
class MissingParserError extends ParserError {
    constructor(message, cause) {
        super(message, 'MISSING_PARSER', cause);
    }
}
exports.MissingParserError = MissingParserError;
class ParseTimeoutError extends ParserError {
    constructor(message, cause) {
        super(message, 'PARSE_TIMEOUT', cause);
    }
}
exports.ParseTimeoutError = ParseTimeoutError;
class ReadFailureError extends ParserError {
    constructor(message, cause) {
        super(message, 'READ_FAILURE', cause);
    }
}
exports.ReadFailureError = ReadFailureError;
class PermissionDeniedParserError extends ParserError {
    constructor(message, cause) {
        super(message, 'PERMISSION_DENIED', cause);
    }
}
exports.PermissionDeniedParserError = PermissionDeniedParserError;
class InvalidMimeTypeError extends ParserError {
    constructor(message, cause) {
        super(message, 'INVALID_MIME_TYPE', cause);
    }
}
exports.InvalidMimeTypeError = InvalidMimeTypeError;
class InvalidExtensionError extends ParserError {
    constructor(message, cause) {
        super(message, 'INVALID_EXTENSION', cause);
    }
}
exports.InvalidExtensionError = InvalidExtensionError;
class InvalidBufferError extends ParserError {
    constructor(message, cause) {
        super(message, 'INVALID_BUFFER', cause);
    }
}
exports.InvalidBufferError = InvalidBufferError;
class UnexpectedParserError extends ParserError {
    constructor(message, cause) {
        super(message, 'UNEXPECTED_PARSER_FAILURE', cause);
    }
}
exports.UnexpectedParserError = UnexpectedParserError;
//# sourceMappingURL=parser.errors.js.map