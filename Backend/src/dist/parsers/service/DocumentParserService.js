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
exports.documentParserService = exports.DocumentParserService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const ParserFactory_1 = require("../factory/ParserFactory");
const mime_1 = require("../utils/mime");
const parser_errors_1 = require("../errors/parser.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('DocumentParserService');
/**
 * Service class coordinating document parsing.
 * Supports file paths, direct binary buffers, and readable streams.
 */
class DocumentParserService {
    /**
     * Parses a document given its local absolute file path.
     * @param filePath Absolute path of the document on the local filesystem.
     * @throws ReadFailureError if the file does not exist or lacks read permissions.
     */
    async parseFilePath(filePath) {
        logger.info(`Parsing document from file path: ${filePath}`);
        try {
            const filename = path.basename(filePath);
            const stat = await fs.stat(filePath);
            const buffer = await fs.readFile(filePath);
            const { mimeType, extension } = mime_1.MimeDetector.detect(buffer, filename);
            const parser = ParserFactory_1.ParserFactory.getParser(extension, mimeType);
            return await parser.parse(buffer, {
                filename,
                size: stat.size,
            });
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new parser_errors_1.ReadFailureError(`File not found at path: ${filePath}`, error);
            }
            if (error.code === 'EACCES') {
                throw new parser_errors_1.ReadFailureError(`Permission denied accessing file: ${filePath}`, error);
            }
            if (error instanceof parser_errors_1.UnexpectedParserError || error.code) {
                throw error;
            }
            throw new parser_errors_1.UnexpectedParserError(`Unexpected failure parsing path: ${filePath}`, error);
        }
    }
    /**
     * Parses binary buffer content using filename extension mappings.
     * @param buffer Binary file contents.
     * @param filename Filename containing extensions (e.g. 'notes.docx').
     * @throws InvalidBufferError if input is not a Buffer.
     */
    async parseBuffer(buffer, filename) {
        logger.info(`Parsing document from buffer...`, { filename });
        if (!Buffer.isBuffer(buffer)) {
            throw new parser_errors_1.InvalidBufferError('Provided input is not a valid Node.js Buffer.');
        }
        try {
            const { mimeType, extension } = mime_1.MimeDetector.detect(buffer, filename);
            const parser = ParserFactory_1.ParserFactory.getParser(extension, mimeType);
            return await parser.parse(buffer, {
                filename,
                size: buffer.length,
            });
        }
        catch (error) {
            if (error.code)
                throw error;
            throw new parser_errors_1.UnexpectedParserError('Unexpected failure parsing buffer.', error);
        }
    }
    /**
     * Parses a document provided as a Node.js Readable stream.
     * @param stream Readable stream source.
     * @param filename Filename containing extensions.
     */
    async parseStream(stream, filename) {
        logger.info(`Parsing document from stream...`, { filename });
        try {
            const buffer = await this.streamToBuffer(stream);
            return await this.parseBuffer(buffer, filename);
        }
        catch (error) {
            if (error.code)
                throw error;
            throw new parser_errors_1.UnexpectedParserError('Unexpected failure reading stream.', error);
        }
    }
    /**
     * Helper to collect readable streams into a memory buffer.
     */
    async streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => {
                if (Buffer.isBuffer(chunk)) {
                    chunks.push(chunk);
                }
                else {
                    chunks.push(Buffer.from(chunk));
                }
            });
            stream.on('error', (err) => {
                logger.error('Stream read failure.', err);
                reject(new parser_errors_1.ReadFailureError('Failed to read from document stream.', err));
            });
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }
}
exports.DocumentParserService = DocumentParserService;
exports.documentParserService = new DocumentParserService();
//# sourceMappingURL=DocumentParserService.js.map