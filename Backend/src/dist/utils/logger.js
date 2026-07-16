"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
/**
 * Structured logger utility for the Firestore module.
 * Sanitizes sensitive fields before writing logs to console.
 */
class Logger {
    serviceName;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    /**
     * Format log message with timestamp, severity level, and sanitized metadata.
     */
    formatMessage(level, message, metadata) {
        const timestamp = new Date().toISOString();
        const metaStr = metadata ? ` | Meta: ${JSON.stringify(this.sanitizeMetadata(metadata))}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] - ${message}${metaStr}`;
    }
    /**
     * Recursively redacts sensitive keys from metadata objects.
     */
    sanitizeMetadata(metadata) {
        if (!metadata)
            return metadata;
        try {
            const sanitized = JSON.parse(JSON.stringify(metadata));
            const sensitiveKeys = [
                'privateKey',
                'private_key',
                'password',
                'token',
                'apiKey',
                'api_key',
                'credentials',
                'clientEmail',
                'client_email',
            ];
            const sanitizeObj = (obj) => {
                for (const key in obj) {
                    if (sensitiveKeys.includes(key)) {
                        obj[key] = '***REDACTED***';
                    }
                    else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitizeObj(obj[key]);
                    }
                }
            };
            sanitizeObj(sanitized);
            return sanitized;
        }
        catch (e) {
            return '[Unsanitizable Metadata]';
        }
    }
    info(message, metadata) {
        console.log(this.formatMessage('info', message, metadata));
    }
    error(message, error, metadata) {
        const errMeta = error instanceof Error
            ? { message: error.message, stack: error.stack, ...metadata }
            : { error, ...metadata };
        console.error(this.formatMessage('error', message, errMeta));
    }
    warn(message, metadata) {
        console.warn(this.formatMessage('warn', message, metadata));
    }
    debug(message, metadata) {
        console.debug(this.formatMessage('debug', message, metadata));
    }
}
exports.Logger = Logger;
exports.logger = new Logger('FirestoreModule');
//# sourceMappingURL=logger.js.map