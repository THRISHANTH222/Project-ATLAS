import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument, DocumentMetadata, ParsedTable } from '../types/document.types';
import { CorruptedFileError, EmptyDocumentError, UnexpectedParserError } from '../errors/parser.errors';
import mammoth from 'mammoth';
import { Logger } from '../../utils/logger';

const logger = new Logger('DocxParser');

/**
 * Concrete parser strategy for Microsoft Word DOCX files (.docx) using 'mammoth'.
 */
export class DocxParser implements DocumentParser {
  /**
   * Returns true if the file parameters specify a DOCX document.
   */
  public supports(extension: string, mimeType: string): boolean {
    const cleanExt = extension.toLowerCase();
    const cleanMime = mimeType.toLowerCase();
    return (
      cleanExt === 'docx' ||
      cleanMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  /**
   * Parses DOCX binary content and extracts structured text, paragraphs, and tables.
   */
  public async parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument> {
    const startTime = Date.now();
    logger.info('Starting DOCX extraction...', { filename: metadataFallback?.filename });

    if (!buffer || buffer.length === 0) {
      throw new EmptyDocumentError('DOCX content buffer is empty or missing.');
    }

    try {
      // 1. Extract raw body text and library messages
      const textResult = await mammoth.extractRawText({ buffer });
      const extractedText = textResult.value || '';
      const warnings = textResult.messages.map(msg => `${msg.type}: ${msg.message}`);

      // Separate lines into paragraphs
      const paragraphs = extractedText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // 2. Extract HTML to parse tables using regex patterns
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const html = htmlResult.value || '';

      const tables: ParsedTable[] = [];
      const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

      let tableMatch;
      while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableContent = tableMatch[1];
        const rows: string[][] = [];
        let rowMatch;
        let headers: string[] = [];
        let isFirstRow = true;

        while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
          const rowContent = rowMatch[1];
          const cells: string[] = [];
          let cellMatch;
          while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
            cells.push(cellText);
          }

          if (cells.length > 0) {
            if (isFirstRow) {
              headers = cells;
              isFirstRow = false;
            } else {
              rows.push(cells);
            }
          }
        }

        if (headers.length > 0 || rows.length > 0) {
          tables.push({ headers, rows });
        }
      }

      // Populate basic file system metadata
      const metadata: DocumentMetadata = {
        filename: metadataFallback?.filename,
        extension: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: metadataFallback?.size || buffer.length,
        encoding: 'utf-8',
      };

      const durationMs = Date.now() - startTime;
      logger.info('Successfully completed DOCX extraction.', { durationMs, tablesCount: tables.length });

      return {
        extractedText,
        paragraphs,
        tables,
        metadata,
        warnings,
        parserUsed: 'mammoth',
        parsingDurationMs: durationMs,
      };
    } catch (error: any) {
      logger.error('Failed to parse DOCX document.', error);
      
      const errMsg = error.message || '';
      if (
        errMsg.includes('corrupt') || 
        errMsg.includes('zip') || 
        errMsg.includes('invalid') || 
        errMsg.includes('end of central directory')
      ) {
        throw new CorruptedFileError('DOCX file is corrupted or not a valid zip container.', error);
      }
      throw new UnexpectedParserError('An unexpected error occurred while parsing the DOCX.', error);
    }
  }
}
