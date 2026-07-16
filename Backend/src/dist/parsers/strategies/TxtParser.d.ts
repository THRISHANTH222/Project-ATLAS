import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument } from '../types/document.types';
/**
 * Concrete parser strategy for Plain Text files (.txt) using Node native Buffer.
 */
export declare class TxtParser implements DocumentParser {
    /**
     * Returns true if the file parameters specify a plain text file.
     */
    supports(extension: string, mimeType: string): boolean;
    /**
     * Parses TXT binary content and extracts plain text, lines, and metadata.
     */
    parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument>;
}
//# sourceMappingURL=TxtParser.d.ts.map