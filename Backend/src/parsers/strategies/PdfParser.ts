import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument, DocumentMetadata } from '../types/document.types';
import { CorruptedFileError, EmptyDocumentError, UnexpectedParserError } from '../errors/parser.errors';
import pdfParse from 'pdf-parse';
import { Logger } from '../../utils/logger';

const logger = new Logger('PdfParser');

/**
 * Concrete parser strategy for PDF files (.pdf) using 'pdf-parse'.
 */
export class PdfParser implements DocumentParser {
  /**
   * Returns true if the file parameters specify a PDF.
   */
  public supports(extension: string, mimeType: string): boolean {
    const cleanExt = extension.toLowerCase();
    const cleanMime = mimeType.toLowerCase();
    return cleanExt === 'pdf' || cleanMime === 'application/pdf';
  }

  /**
   * Parses PDF binary buffers and extracts text, pagination structures, and fields.
   */
  public async parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument> {
    const startTime = Date.now();
    logger.info('Starting PDF extraction...', { filename: metadataFallback?.filename });

    if (!buffer || buffer.length === 0) {
      throw new EmptyDocumentError('PDF content buffer is empty or missing.');
    }

    try {
      // Execute the parsing library
      const data = await pdfParse(buffer);

      const pageCount = data.numpages || 0;
      const extractedText = data.text || '';

      // Heuristically segment pages using standard form feed '\x0c' character
      const pages = extractedText
        .split(/\x0c/)
        .map(page => page.trim())
        .filter(page => page.length > 0);

      // Heuristically group paragraphs by double line breaks
      const paragraphs = extractedText
        .split(/\n\s*\n/)
        .map(para => para.trim())
        .filter(para => para.length > 0);

      // Map parsed metadata safely
      const info = data.info || {};
      const metadata: DocumentMetadata = {
        filename: metadataFallback?.filename,
        extension: 'pdf',
        mimeType: 'application/pdf',
        size: metadataFallback?.size || buffer.length,
        encoding: 'utf-8',
        pageCount,
        author: typeof info.Author === 'string' ? info.Author.trim() : undefined,
        title: typeof info.Title === 'string' ? info.Title.trim() : undefined,
        subject: typeof info.Subject === 'string' ? info.Subject.trim() : undefined,
        creator: typeof info.Creator === 'string' ? info.Creator.trim() : undefined,
        producer: typeof info.Producer === 'string' ? info.Producer.trim() : undefined,
        creationDate: typeof info.CreationDate === 'string' ? info.CreationDate : undefined,
        modificationDate: typeof info.ModDate === 'string' ? info.ModDate : undefined,
      };

      const durationMs = Date.now() - startTime;
      logger.info('Successfully completed PDF extraction.', { durationMs, pages: pageCount });

      return {
        extractedText,
        pages,
        paragraphs,
        metadata,
        warnings: [],
        parserUsed: 'pdf-parse',
        parsingDurationMs: durationMs,
      };
    } catch (error: any) {
      logger.error('Failed to parse PDF document.', error);
      
      const errMsg = error.message || '';
      if (
        errMsg.includes('corrupt') || 
        errMsg.includes('Invalid PDF') || 
        errMsg.includes('format error')
      ) {
        throw new CorruptedFileError('PDF file is corrupted or formatted incorrectly.', error);
      }
      throw new UnexpectedParserError('An unexpected error occurred while parsing the PDF.', error);
    }
  }
}
