/**
 * Base custom exception for all document parsing errors.
 * Preserves the inner/original cause stack trace if provided.
 */
export declare class ParserError extends Error {
    readonly code: string;
    readonly cause?: Error;
    constructor(message: string, code: string, cause?: Error);
}
export declare class UnsupportedFileTypeError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class CorruptedFileError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class EmptyDocumentError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class InvalidFileError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class MissingParserError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class ParseTimeoutError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class ReadFailureError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class PermissionDeniedParserError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class InvalidMimeTypeError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class InvalidExtensionError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class InvalidBufferError extends ParserError {
    constructor(message: string, cause?: Error);
}
export declare class UnexpectedParserError extends ParserError {
    constructor(message: string, cause?: Error);
}
//# sourceMappingURL=parser.errors.d.ts.map