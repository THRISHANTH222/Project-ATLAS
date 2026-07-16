/**
 * Utility class to detect and validate MIME types and file extensions
 * using filename extensions and buffer magic number signatures.
 */
export declare class MimeDetector {
    private static readonly extMap;
    /**
     * Detects the MIME type and extension using filename or magic numbers from a buffer.
     * @param buffer Binary file contents.
     * @param filename Original filename.
     */
    static detect(buffer?: Buffer, filename?: string): {
        mimeType: string;
        extension: string;
    };
    /**
     * Helper to check if a specific extension/mime type is supported.
     * @param extension File extension.
     * @param mimeType MIME Type.
     */
    static isSupported(extension: string, mimeType: string): boolean;
}
//# sourceMappingURL=mime.d.ts.map