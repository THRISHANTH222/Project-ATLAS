/**
 * Structured logger utility for the Firestore module.
 * Sanitizes sensitive fields before writing logs to console.
 */
export declare class Logger {
    private serviceName;
    constructor(serviceName: string);
    /**
     * Format log message with timestamp, severity level, and sanitized metadata.
     */
    private formatMessage;
    /**
     * Recursively redacts sensitive keys from metadata objects.
     */
    private sanitizeMetadata;
    info(message: string, metadata?: any): void;
    error(message: string, error?: Error | any, metadata?: any): void;
    warn(message: string, metadata?: any): void;
    debug(message: string, metadata?: any): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map