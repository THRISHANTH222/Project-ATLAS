"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.XlsxParser = void 0;
const parser_errors_1 = require("../errors/parser.errors");
const XLSX = __importStar(require("xlsx"));
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('XlsxParser');
/**
 * Concrete parser strategy for Microsoft Excel files (.xlsx) using 'xlsx' (SheetJS).
 */
class XlsxParser {
    /**
     * Returns true if the file parameters specify an XLSX spreadsheet.
     */
    supports(extension, mimeType) {
        const cleanExt = extension.toLowerCase();
        const cleanMime = mimeType.toLowerCase();
        return (cleanExt === 'xlsx' ||
            cleanMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    /**
     * Parses XLSX binary content, extracts rows, cell values, and sheet structures.
     */
    async parse(buffer, metadataFallback) {
        const startTime = Date.now();
        logger.info('Starting XLSX extraction...', { filename: metadataFallback?.filename });
        if (!buffer || buffer.length === 0) {
            throw new parser_errors_1.EmptyDocumentError('XLSX content buffer is empty or missing.');
        }
        try {
            // Load spreadsheet workbook
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const worksheetNames = workbook.SheetNames || [];
            const worksheetCount = worksheetNames.length;
            let totalRowCount = 0;
            let totalColumnCount = 0;
            const worksheets = {};
            const textContentBlocks = [];
            for (const sheetName of worksheetNames) {
                const sheet = workbook.Sheets[sheetName];
                if (!sheet)
                    continue;
                // Convert the sheet object to a 2D string array
                const sheetData = XLSX.utils.sheet_to_json(sheet, {
                    header: 1, // Request raw 2D array representation
                    defval: '', // Populate missing/blank cells with empty string
                });
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
            let creationDate;
            if (props.CreatedDate) {
                try {
                    creationDate = new Date(props.CreatedDate).toISOString();
                }
                catch {
                    // Gracefully fallback on date formatting failure
                    creationDate = String(props.CreatedDate);
                }
            }
            const metadata = {
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
        }
        catch (error) {
            logger.error('Failed to parse XLSX document.', error);
            const errMsg = error.message || '';
            if (errMsg.includes('corrupt') ||
                errMsg.includes('Unsupported file') ||
                errMsg.includes('invalid') ||
                errMsg.includes('end of central directory')) {
                throw new parser_errors_1.CorruptedFileError('XLSX file is corrupted or not a valid Excel workbook container.', error);
            }
            throw new parser_errors_1.UnexpectedParserError('An unexpected error occurred while parsing the XLSX.', error);
        }
    }
}
exports.XlsxParser = XlsxParser;
//# sourceMappingURL=XlsxParser.js.map