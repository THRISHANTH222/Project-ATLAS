"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocxParser = void 0;
const parser_errors_1 = require("../errors/parser.errors");
const mammoth_1 = __importDefault(require("mammoth"));
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('DocxParser');
/**
 * Concrete parser strategy for Microsoft Word DOCX files (.docx) using 'mammoth'.
 */
class DocxParser {
    /**
     * Returns true if the file parameters specify a DOCX document.
     */
    supports(extension, mimeType) {
        const cleanExt = extension.toLowerCase();
        const cleanMime = mimeType.toLowerCase();
        return (cleanExt === 'docx' ||
            cleanMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }
    /**
     * Parses DOCX binary content and extracts structured text, paragraphs, and tables.
     */
    async parse(buffer, metadataFallback) {
        const startTime = Date.now();
        logger.info('Starting DOCX extraction...', { filename: metadataFallback?.filename });
        if (!buffer || buffer.length === 0) {
            throw new parser_errors_1.EmptyDocumentError('DOCX content buffer is empty or missing.');
        }
        try {
            // 1. Extract raw body text and library messages
            const textResult = await mammoth_1.default.extractRawText({ buffer });
            const extractedText = textResult.value || '';
            const warnings = textResult.messages.map(msg => `${msg.type}: ${msg.message}`);
            // Separate lines into paragraphs
            const paragraphs = extractedText
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);
            // 2. Extract HTML to parse tables using regex patterns
            const htmlResult = await mammoth_1.default.convertToHtml({ buffer });
            const html = htmlResult.value || '';
            const tables = [];
            const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let tableMatch;
            while ((tableMatch = tableRegex.exec(html)) !== null) {
                const tableContent = tableMatch[1];
                const rows = [];
                let rowMatch;
                let headers = [];
                let isFirstRow = true;
                while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
                    const rowContent = rowMatch[1];
                    const cells = [];
                    let cellMatch;
                    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
                        const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
                        cells.push(cellText);
                    }
                    if (cells.length > 0) {
                        if (isFirstRow) {
                            headers = cells;
                            isFirstRow = false;
                        }
                        else {
                            rows.push(cells);
                        }
                    }
                }
                if (headers.length > 0 || rows.length > 0) {
                    tables.push({ headers, rows });
                }
            }
            // Populate basic file system metadata
            const metadata = {
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
        }
        catch (error) {
            logger.error('Failed to parse DOCX document.', error);
            const errMsg = error.message || '';
            if (errMsg.includes('corrupt') ||
                errMsg.includes('zip') ||
                errMsg.includes('invalid') ||
                errMsg.includes('end of central directory')) {
                throw new parser_errors_1.CorruptedFileError('DOCX file is corrupted or not a valid zip container.', error);
            }
            throw new parser_errors_1.UnexpectedParserError('An unexpected error occurred while parsing the DOCX.', error);
        }
    }
}
exports.DocxParser = DocxParser;
//# sourceMappingURL=DocxParser.js.map