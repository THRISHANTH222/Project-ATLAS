import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument } from '../types/document.types';
/**
 * Concrete parser strategy for Microsoft Excel files (.xlsx) using 'xlsx' (SheetJS).
 */
export declare class XlsxParser implements DocumentParser {
    /**
     * Returns true if the file parameters specify an XLSX spreadsheet.
     */
    supports(extension: string, mimeType: string): boolean;
    /**
     * Parses XLSX binary content, extracts rows, cell values, and sheet structures.
     */
    parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument>;
}
//# sourceMappingURL=XlsxParser.d.ts.map