"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserFactory = void 0;
const PdfParser_1 = require("../strategies/PdfParser");
const DocxParser_1 = require("../strategies/DocxParser");
const TxtParser_1 = require("../strategies/TxtParser");
const XlsxParser_1 = require("../strategies/XlsxParser");
const parser_errors_1 = require("../errors/parser.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('ParserFactory');
/**
 * Registry Factory class to select and resolve appropriate document parser strategies.
 * Supports dynamic runtime registration to comply with the Open/Closed Principle (OCP).
 */
class ParserFactory {
    static parsers = [];
    // Register default formats inside static initializer block
    static {
        ParserFactory.registerParser(new PdfParser_1.PdfParser());
        ParserFactory.registerParser(new DocxParser_1.DocxParser());
        ParserFactory.registerParser(new TxtParser_1.TxtParser());
        ParserFactory.registerParser(new XlsxParser_1.XlsxParser());
    }
    /**
     * Dynamically registers a new parser strategy.
     * Enables adding new formats without editing existing source classes.
     * @param parser The DocumentParser instance to register.
     */
    static registerParser(parser) {
        this.parsers.push(parser);
        logger.info(`Successfully registered strategy: ${parser.constructor.name}`);
    }
    /**
     * Resolves the appropriate DocumentParser for the provided extension and MIME type.
     * @param extension The file extension (e.g. 'pdf').
     * @param mimeType The file MIME type (e.g. 'application/pdf').
     * @throws UnsupportedFileTypeError if no strategy matches.
     */
    static getParser(extension, mimeType) {
        const matched = this.parsers.find(p => p.supports(extension, mimeType));
        if (!matched) {
            logger.warn(`Resolution failed. Extension: '${extension}', MIME: '${mimeType}'`);
            throw new parser_errors_1.UnsupportedFileTypeError(`Unsupported document format. Extension: '${extension}', MIME: '${mimeType}'`);
        }
        logger.debug(`Resolved document parser: ${matched.constructor.name}`);
        return matched;
    }
}
exports.ParserFactory = ParserFactory;
//# sourceMappingURL=ParserFactory.js.map