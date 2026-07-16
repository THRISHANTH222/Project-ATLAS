import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument } from '../types/document.types';
/**
 * Concrete parser strategy for Microsoft Word DOCX files (.docx) using 'mammoth'.
 */
export declare class DocxParser implements DocumentParser {
    /**
     * Returns true if the file parameters specify a DOCX document.
     */
    supports(extension: string, mimeType: string): boolean;
    /**
     * Parses DOCX binary content and extracts structured text, paragraphs, and tables.
     */
    parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument>;
}
//# sourceMappingURL=DocxParser.d.ts.map