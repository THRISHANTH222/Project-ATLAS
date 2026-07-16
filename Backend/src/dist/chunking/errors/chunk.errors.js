"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingError = exports.InvalidConfigError = exports.EmptyInputError = exports.ChunkingError = void 0;
/**
 * Base custom exception for all text chunking errors.
 * Preserves the inner/original cause stack trace if provided.
 */
class ChunkingError extends Error {
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
exports.ChunkingError = ChunkingError;
class EmptyInputError extends ChunkingError {
    constructor(message, cause) {
        super(message, 'EMPTY_INPUT', cause);
    }
}
exports.EmptyInputError = EmptyInputError;
class InvalidConfigError extends ChunkingError {
    constructor(message, cause) {
        super(message, 'INVALID_CONFIGURATION', cause);
    }
}
exports.InvalidConfigError = InvalidConfigError;
class ProcessingError extends ChunkingError {
    constructor(message, cause) {
        super(message, 'PROCESSING_FAILURE', cause);
    }
}
exports.ProcessingError = ProcessingError;
//# sourceMappingURL=chunk.errors.js.map