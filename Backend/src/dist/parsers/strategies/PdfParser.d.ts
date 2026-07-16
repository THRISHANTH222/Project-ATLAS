import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument } from '../types/document.types';
/**
 * Concrete parser strategy for PDF files (.pdf) using 'pdf-parse'.
 */
export declare class PdfParser implements DocumentParser {
    /**
     * Returns true if the file parameters specify a PDF.
     */
    supports(extension: string, mimeType: string): boolean;
    /**
     * Parses PDF binary buffers and extracts text, pagination structures, and fields.
     */
    parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument>;
}
//# sourceMappingURL=PdfParser.d.ts.map