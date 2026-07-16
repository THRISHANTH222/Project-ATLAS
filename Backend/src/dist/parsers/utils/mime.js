"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MimeDetector = void 0;
/**
 * Utility class to detect and validate MIME types and file extensions
 * using filename extensions and buffer magic number signatures.
 */
class MimeDetector {
    static extMap = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
    };
    /**
     * Detects the MIME type and extension using filename or magic numbers from a buffer.
     * @param buffer Binary file contents.
     * @param filename Original filename.
     */
    static detect(buffer, filename) {
        let extension = '';
        let mimeType = 'application/octet-stream';
        // 1. Check extension from filename
        if (filename) {
            const parts = filename.split('.');
            if (parts.length > 1) {
                extension = parts[parts.length - 1].toLowerCase();
            }
        }
        if (extension && this.extMap[extension]) {
            mimeType = this.extMap[extension];
        }
        // 2. Refine using magic numbers
        if (buffer && buffer.length >= 4) {
            const signature = buffer.toString('hex', 0, 4).toUpperCase();
            // %PDF-
            if (signature === '25504446') {
                return { mimeType: 'application/pdf', extension: 'pdf' };
            }
            // PK\x03\x04 (Zip format used by DOCX and XLSX)
            if (signature === '504B0304') {
                if (extension === 'docx') {
                    return { mimeType: this.extMap.docx, extension: 'docx' };
                }
                if (extension === 'xlsx') {
                    return { mimeType: this.extMap.xlsx, extension: 'xlsx' };
                }
                // Heuristically search header segments of the ZIP for package identities
                const headerStr = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8');
                if (headerStr.includes('word/')) {
                    return { mimeType: this.extMap.docx, extension: 'docx' };
                }
                if (headerStr.includes('xl/')) {
                    return { mimeType: this.extMap.xlsx, extension: 'xlsx' };
                }
                return { mimeType: 'application/zip', extension: 'zip' };
            }
            // Plain Text (heuristic detection of printable characters)
            let isText = true;
            const scanLimit = Math.min(buffer.length, 512);
            for (let i = 0; i < scanLimit; i++) {
                const charCode = buffer[i];
                // Allow common controls (TAB, LF, CR) but fail on other binary chars
                if (charCode < 9 || (charCode > 13 && charCode < 32)) {
                    isText = false;
                    break;
                }
            }
            if (isText) {
                return { mimeType: 'text/plain', extension: 'txt' };
            }
        }
        return { mimeType, extension };
    }
    /**
     * Helper to check if a specific extension/mime type is supported.
     * @param extension File extension.
     * @param mimeType MIME Type.
     */
    static isSupported(extension, mimeType) {
        const cleanExt = extension.toLowerCase();
        const cleanMime = mimeType.toLowerCase();
        return !!(this.extMap[cleanExt] || Object.values(this.extMap).includes(cleanMime));
    }
}
exports.MimeDetector = MimeDetector;
//# sourceMappingURL=mime.js.map