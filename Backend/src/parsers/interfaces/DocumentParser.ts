import { ParsedDocument } from '../types/document.types';

/**
 * Interface that all document parser strategies must implement.
 * Ensures identical contract signatures for PDF, DOCX, TXT, and XLSX.
 */
export interface DocumentParser {
  /**
   * Identifies whether this parser strategy supports the given file format.
   * @param extension The file extension (e.g., 'pdf').
   * @param mimeType The file MIME type (e.g., 'application/pdf').
   */
  supports(extension: string, mimeType: string): boolean;

  /**
   * Parses the document binary buffer and extracts structured text, tables, and metadata.
   * @param buffer The document file binary content.
   * @param metadataFallback Optional fallback metadata fields (e.g., original filename, size).
   */
  parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument>;
}
