import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument, DocumentMetadata } from '../types/document.types';
import { CorruptedFileError, EmptyDocumentError, UnexpectedParserError } from '../errors/parser.errors';
import * as XLSX from 'xlsx';
import { Logger } from '../../utils/logger';

const logger = new Logger('XlsxParser');

/**
 * Concrete parser strategy for Microsoft Excel files (.xlsx) using 'xlsx' (SheetJS).
 */
export class XlsxParser implements DocumentParser {
  /**
   * Returns true if the file parameters specify an XLSX spreadsheet.
   */
  public supports(extension: string, mimeType: string): boolean {
    const cleanExt = extension.toLowerCase();
    const cleanMime = mimeType.toLowerCase();
    return (
      cleanExt === 'xlsx' ||
      cleanMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  /**
   * Parses XLSX binary content, extracts rows, cell values, and sheet structures.
   */
  public async parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument> {
    const startTime = Date.now();
    logger.info('Starting XLSX extraction...', { filename: metadataFallback?.filename });

    if (!buffer || buffer.length === 0) {
      throw new EmptyDocumentError('XLSX content buffer is empty or missing.');
    }

    try {
      // Load spreadsheet workbook
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      const worksheetNames = workbook.SheetNames || [];
      const worksheetCount = worksheetNames.length;

      let totalRowCount = 0;
      let totalColumnCount = 0;
      const worksheets: Record<string, string[][]> = {};
      const textContentBlocks: string[] = [];

      for (const sheetName of worksheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        // Convert the sheet object to a 2D string array
        const sheetData: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,      // Request raw 2D array representation
          defval: '',     // Populate missing/blank cells with empty string
        }) as string[][];

        worksheets[sheetName] = sheetData.map(row => row.map(cell => String(cell)));

        const rowCount = sheetData.length;
        totalRowCount += rowCount;

        // Keep track of maximum columns found in this workbook
        let maxCols = 0;
        for (const row of sheetData) {
          if (row.length > maxCols) {
            maxCols = row.length;
          }
        }
        totalColumnCount = Math.max(totalColumnCount, maxCols);

        // Build a readable tab-separated text block representation of the worksheet
        textContentBlocks.push(`--- Sheet: ${sheetName} ---`);
        for (let r = 0; r < rowCount; r++) {
          const rowValues = sheetData[r].map(cell => String(cell).trim());
          // Only output row if it contains at least one non-empty value
          if (rowValues.some(val => val.length > 0)) {
            textContentBlocks.push(rowValues.join('\t'));
          }
        }
        textContentBlocks.push(''); // Add spacer line between sheets
      }

      const extractedText = textContentBlocks.join('\n').trim();

      // Extract metadata values (worksheet count, authors, titles, etc.)
      const props = workbook.Props || {};
      
      let creationDate: string | undefined;
      if (props.CreatedDate) {
        try {
          creationDate = new Date(props.CreatedDate).toISOString();
        } catch {
          // Gracefully fallback on date formatting failure
          creationDate = String(props.CreatedDate);
        }
      }

      const metadata: DocumentMetadata = {
        filename: metadataFallback?.filename,
        extension: 'xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: metadataFallback?.size || buffer.length,
        encoding: 'utf-8',
        worksheetCount,
        worksheetNames,
        rowCount: totalRowCount,
        columnCount: totalColumnCount,
        author: typeof props.Author === 'string' ? props.Author.trim() : undefined,
        title: typeof props.Title === 'string' ? props.Title.trim() : undefined,
        subject: typeof props.Subject === 'string' ? props.Subject.trim() : undefined,
        company: typeof props.Company === 'string' ? props.Company.trim() : undefined,
        creationDate,
      };

      const durationMs = Date.now() - startTime;
      logger.info('Successfully completed XLSX extraction.', { durationMs, worksheetCount });

      return {
        extractedText,
        worksheetNames,
        worksheets,
        metadata,
        warnings: [],
        parserUsed: 'xlsx-sheetjs',
        parsingDurationMs: durationMs,
      };
    } catch (error: any) {
      logger.error('Failed to parse XLSX document.', error);
      
      const errMsg = error.message || '';
      if (
        errMsg.includes('corrupt') ||
        errMsg.includes('Unsupported file') ||
        errMsg.includes('invalid') ||
        errMsg.includes('end of central directory')
      ) {
        throw new CorruptedFileError('XLSX file is corrupted or not a valid Excel workbook container.', error);
      }
      throw new UnexpectedParserError('An unexpected error occurred while parsing the XLSX.', error);
    }
  }
}
