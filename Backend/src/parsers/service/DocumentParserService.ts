import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import { ParsedDocument } from '../types/document.types';
import { ParserFactory } from '../factory/ParserFactory';
import { MimeDetector } from '../utils/mime';
import { 
  ReadFailureError, 
  InvalidBufferError, 
  UnexpectedParserError 
} from '../errors/parser.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('DocumentParserService');

/**
 * Service class coordinating document parsing.
 * Supports file paths, direct binary buffers, and readable streams.
 */
export class DocumentParserService {
  /**
   * Parses a document given its local absolute file path.
   * @param filePath Absolute path of the document on the local filesystem.
   * @throws ReadFailureError if the file does not exist or lacks read permissions.
   */
  public async parseFilePath(filePath: string): Promise<ParsedDocument> {
    logger.info(`Parsing document from file path: ${filePath}`);
    try {
      const filename = path.basename(filePath);
      const stat = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);

      const { mimeType, extension } = MimeDetector.detect(buffer, filename);
      const parser = ParserFactory.getParser(extension, mimeType);

      return await parser.parse(buffer, {
        filename,
        size: stat.size,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ReadFailureError(`File not found at path: ${filePath}`, error);
      }
      if (error.code === 'EACCES') {
        throw new ReadFailureError(`Permission denied accessing file: ${filePath}`, error);
      }
      if (error instanceof UnexpectedParserError || error.code) {
        throw error;
      }
      throw new UnexpectedParserError(`Unexpected failure parsing path: ${filePath}`, error);
    }
  }

  /**
   * Parses binary buffer content using filename extension mappings.
   * @param buffer Binary file contents.
   * @param filename Filename containing extensions (e.g. 'notes.docx').
   * @throws InvalidBufferError if input is not a Buffer.
   */
  public async parseBuffer(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    logger.info(`Parsing document from buffer...`, { filename });

    if (!Buffer.isBuffer(buffer)) {
      throw new InvalidBufferError('Provided input is not a valid Node.js Buffer.');
    }

    try {
      const { mimeType, extension } = MimeDetector.detect(buffer, filename);
      const parser = ParserFactory.getParser(extension, mimeType);

      return await parser.parse(buffer, {
        filename,
        size: buffer.length,
      });
    } catch (error: any) {
      if (error.code) throw error;
      throw new UnexpectedParserError('Unexpected failure parsing buffer.', error);
    }
  }

  /**
   * Parses a document provided as a Node.js Readable stream.
   * @param stream Readable stream source.
   * @param filename Filename containing extensions.
   */
  public async parseStream(stream: Readable, filename: string): Promise<ParsedDocument> {
    logger.info(`Parsing document from stream...`, { filename });
    try {
      const buffer = await this.streamToBuffer(stream);
      return await this.parseBuffer(buffer, filename);
    } catch (error: any) {
      if (error.code) throw error;
      throw new UnexpectedParserError('Unexpected failure reading stream.', error);
    }
  }

  /**
   * Helper to collect readable streams into a memory buffer.
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else {
          chunks.push(Buffer.from(chunk));
        }
      });
      stream.on('error', (err) => {
        logger.error('Stream read failure.', err);
        reject(new ReadFailureError('Failed to read from document stream.', err));
      });
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }
}
export const documentParserService = new DocumentParserService();
