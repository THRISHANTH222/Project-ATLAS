import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedDocument, DocumentMetadata } from '../types/document.types';
import { EmptyDocumentError, UnexpectedParserError } from '../errors/parser.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('TxtParser');

/**
 * Concrete parser strategy for Plain Text files (.txt) using Node native Buffer.
 */
export class TxtParser implements DocumentParser {
  /**
   * Returns true if the file parameters specify a plain text file.
   */
  public supports(extension: string, mimeType: string): boolean {
    const cleanExt = extension.toLowerCase();
    const cleanMime = mimeType.toLowerCase();
    return cleanExt === 'txt' || cleanMime === 'text/plain';
  }

  /**
   * Parses TXT binary content and extracts plain text, lines, and metadata.
   */
  public async parse(buffer: Buffer, metadataFallback?: Record<string, any>): Promise<ParsedDocument> {
    const startTime = Date.now();
    logger.info('Starting TXT extraction...', { filename: metadataFallback?.filename });

    if (!buffer || buffer.length === 0) {
      throw new EmptyDocumentError('TXT content buffer is empty or missing.');
    }

    try {
      // Heuristically detect common Byte Order Mark (BOM) values
      let encoding: BufferEncoding = 'utf8';
      const warnings: string[] = [];

      if (buffer.length >= 2) {
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
          encoding = 'utf16le';
        } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
          // Node doesn't natively support utf-16be; warn and fallback to utf8
          encoding = 'utf8';
          warnings.push('UTF-16BE encoding detected via BOM. Decoded as UTF-8 fallback.');
        }
      }

      const extractedText = buffer.toString(encoding);

      // Split text into individual lines
      const lines = extractedText.split(/\r?\n/);
      const lineCount = lines.length;
      const characterCount = extractedText.length;

      // Group paragraphs by empty lines
      const paragraphs = extractedText
        .split(/\r?\n\s*\r?\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Populate text metadata
      const metadata: DocumentMetadata = {
        filename: metadataFallback?.filename,
        extension: 'txt',
        mimeType: 'text/plain',
        size: metadataFallback?.size || buffer.length,
        encoding,
        lineCount,
        characterCount,
      };

      const durationMs = Date.now() - startTime;
      logger.info('Successfully completed TXT extraction.', { durationMs, lineCount });

      return {
        extractedText,
        pages: lines,
        paragraphs,
        metadata,
        warnings,
        parserUsed: 'native-buffer',
        parsingDurationMs: durationMs,
      };
    } catch (error: any) {
      logger.error('Failed to parse TXT document.', error);
      throw new UnexpectedParserError('An unexpected error occurred while parsing the TXT file.', error);
    }
  }
}
