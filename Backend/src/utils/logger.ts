/**
 * Structured logger utility for the Firestore module.
 * Sanitizes sensitive fields before writing logs to console.
 */
export class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Format log message with timestamp, severity level, and sanitized metadata.
   */
  private formatMessage(level: string, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` | Meta: ${JSON.stringify(this.sanitizeMetadata(metadata))}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] - ${message}${metaStr}`;
  }

  /**
   * Recursively redacts sensitive keys from metadata objects.
   */
  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return metadata;
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

      const sanitizeObj = (obj: any) => {
        for (const key in obj) {
          if (sensitiveKeys.includes(key)) {
            obj[key] = '***REDACTED***';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObj(obj[key]);
          }
        }
      };

      sanitizeObj(sanitized);
      return sanitized;
    } catch (e) {
      return '[Unsanitizable Metadata]';
    }
  }

  public info(message: string, metadata?: any): void {
    console.log(this.formatMessage('info', message, metadata));
  }

  public error(message: string, error?: Error | any, metadata?: any): void {
    const errMeta = error instanceof Error
      ? { message: error.message, stack: error.stack, ...metadata }
      : { error, ...metadata };
    console.error(this.formatMessage('error', message, errMeta));
  }

  public warn(message: string, metadata?: any): void {
    console.warn(this.formatMessage('warn', message, metadata));
  }

  public debug(message: string, metadata?: any): void {
    console.debug(this.formatMessage('debug', message, metadata));
  }
}

export const logger = new Logger('FirestoreModule');
