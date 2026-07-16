import { Readable } from 'stream';
import { ParsedDocument } from '../types/document.types';
/**
 * Service class coordinating document parsing.
 * Supports file paths, direct binary buffers, and readable streams.
 */
export declare class DocumentParserService {
    /**
     * Parses a document given its local absolute file path.
     * @param filePath Absolute path of the document on the local filesystem.
     * @throws ReadFailureError if the file does not exist or lacks read permissions.
     */
    parseFilePath(filePath: string): Promise<ParsedDocument>;
    /**
     * Parses binary buffer content using filename extension mappings.
     * @param buffer Binary file contents.
     * @param filename Filename containing extensions (e.g. 'notes.docx').
     * @throws InvalidBufferError if input is not a Buffer.
     */
    parseBuffer(buffer: Buffer, filename: string): Promise<ParsedDocument>;
    /**
     * Parses a document provided as a Node.js Readable stream.
     * @param stream Readable stream source.
     * @param filename Filename containing extensions.
     */
    parseStream(stream: Readable, filename: string): Promise<ParsedDocument>;
    /**
     * Helper to collect readable streams into a memory buffer.
     */
    private streamToBuffer;
}
export declare const documentParserService: DocumentParserService;
//# sourceMappingURL=DocumentParserService.d.ts.map