/**
 * Standard representation of a parsed table structure.
 */
export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * Standardized metadata extracted across various document formats.
 * Fields are optional and degrade gracefully depending on file format availability.
 */
export interface DocumentMetadata {
  filename?: string;
  extension?: string;
  mimeType?: string;
  size?: number;
  encoding?: string;
  
  // PDF specific
  pageCount?: number;
  author?: string;
  title?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;

  // DOCX specific
  revision?: string;
  company?: string;

  // TXT specific
  lineCount?: number;
  characterCount?: number;

  // XLSX specific
  worksheetCount?: number;
  worksheetNames?: string[];
  rowCount?: number;
  columnCount?: number;
}

/**
 * Unified return envelope format for all parser strategies.
 */
export interface ParsedDocument {
  extractedText: string;
  pages?: string[];
  paragraphs?: string[];
  tables?: ParsedTable[];
  worksheetNames?: string[];
  worksheets?: Record<string, string[][]>;
  metadata: DocumentMetadata;
  warnings: string[];
  parserUsed: string;
  parsingDurationMs: number;
}
