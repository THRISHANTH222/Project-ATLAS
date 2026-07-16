import { DocumentParser } from '../interfaces/DocumentParser';
/**
 * Registry Factory class to select and resolve appropriate document parser strategies.
 * Supports dynamic runtime registration to comply with the Open/Closed Principle (OCP).
 */
export declare class ParserFactory {
    private static readonly parsers;
    /**
     * Dynamically registers a new parser strategy.
     * Enables adding new formats without editing existing source classes.
     * @param parser The DocumentParser instance to register.
     */
    static registerParser(parser: DocumentParser): void;
    /**
     * Resolves the appropriate DocumentParser for the provided extension and MIME type.
     * @param extension The file extension (e.g. 'pdf').
     * @param mimeType The file MIME type (e.g. 'application/pdf').
     * @throws UnsupportedFileTypeError if no strategy matches.
     */
    static getParser(extension: string, mimeType: string): DocumentParser;
}
//# sourceMappingURL=ParserFactory.d.ts.map