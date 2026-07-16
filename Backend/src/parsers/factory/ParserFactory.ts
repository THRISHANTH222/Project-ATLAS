import { DocumentParser } from '../interfaces/DocumentParser';
import { PdfParser } from '../strategies/PdfParser';
import { DocxParser } from '../strategies/DocxParser';
import { TxtParser } from '../strategies/TxtParser';
import { XlsxParser } from '../strategies/XlsxParser';
import { UnsupportedFileTypeError } from '../errors/parser.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('ParserFactory');

/**
 * Registry Factory class to select and resolve appropriate document parser strategies.
 * Supports dynamic runtime registration to comply with the Open/Closed Principle (OCP).
 */
export class ParserFactory {
  private static readonly parsers: DocumentParser[] = [];

  // Register default formats inside static initializer block
  static {
    ParserFactory.registerParser(new PdfParser());
    ParserFactory.registerParser(new DocxParser());
    ParserFactory.registerParser(new TxtParser());
    ParserFactory.registerParser(new XlsxParser());
  }

  /**
   * Dynamically registers a new parser strategy.
   * Enables adding new formats without editing existing source classes.
   * @param parser The DocumentParser instance to register.
   */
  public static registerParser(parser: DocumentParser): void {
    this.parsers.push(parser);
    logger.info(`Successfully registered strategy: ${parser.constructor.name}`);
  }

  /**
   * Resolves the appropriate DocumentParser for the provided extension and MIME type.
   * @param extension The file extension (e.g. 'pdf').
   * @param mimeType The file MIME type (e.g. 'application/pdf').
   * @throws UnsupportedFileTypeError if no strategy matches.
   */
  public static getParser(extension: string, mimeType: string): DocumentParser {
    const matched = this.parsers.find(p => p.supports(extension, mimeType));

    if (!matched) {
      logger.warn(`Resolution failed. Extension: '${extension}', MIME: '${mimeType}'`);
      throw new UnsupportedFileTypeError(
        `Unsupported document format. Extension: '${extension}', MIME: '${mimeType}'`
      );
    }

    logger.debug(`Resolved document parser: ${matched.constructor.name}`);
    return matched;
  }
}
