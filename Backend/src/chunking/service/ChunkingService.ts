import { Chunker } from '../interfaces/Chunker';
import { SentenceChunker } from '../strategies/SentenceChunker';
import { Chunk, ChunkingConfig } from '../types/chunk.types';
import { chunkingConfig as defaultGlobalConfig } from '../config/chunk.config';
import { EmptyInputError } from '../errors/chunk.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('ChunkingService');

/**
 * Service coordinating document chunking operations.
 * Supports partial parameter overrides and wraps timings and structural logs.
 */
export class ChunkingService {
  private readonly chunker: Chunker;

  /**
   * Initializes ChunkingService.
   * Supports injecting alternative strategies to follow Dependency Injection (DI) principles.
   * @param chunker Optional chunking strategy. Defaults to SentenceChunker.
   */
  constructor(chunker?: Chunker) {
    this.chunker = chunker || new SentenceChunker();
  }

  /**
   * Slices raw text content into standard chunks.
   * @param text Raw document text.
   * @param configOverride Custom override rules.
   * @param contextOptional Extra descriptor columns for chunk metadata context.
   * @throws EmptyInputError if text is invalid.
   */
  public chunkText(
    text: string,
    configOverride?: Partial<ChunkingConfig>,
    contextOptional?: { documentId?: string; filename?: string; parserSource?: string }
  ): Chunk[] {
    const startTime = Date.now();

    // Resolve final configurations merging overrides with global settings
    const config: ChunkingConfig = {
      maxChunkSize: configOverride?.maxChunkSize ?? defaultGlobalConfig.maxChunkSize,
      chunkOverlapSize: configOverride?.chunkOverlapSize ?? defaultGlobalConfig.chunkOverlapSize,
      minChunkSize: configOverride?.minChunkSize ?? defaultGlobalConfig.minChunkSize,
      tokenizerStrategy: configOverride?.tokenizerStrategy ?? defaultGlobalConfig.tokenizerStrategy,
    };

    logger.info('Text chunking execution started...', {
      maxChunkSize: config.maxChunkSize,
      overlapSize: config.chunkOverlapSize,
      tokenizer: config.tokenizerStrategy,
      documentId: contextOptional?.documentId,
    });

    if (!text || text.trim().length === 0) {
      logger.error('Aborting chunking. Input text content is empty.');
      throw new EmptyInputError('Text body content must not be null, empty, or undefined.');
    }

    try {
      const chunks = this.chunker.chunk(text, config, contextOptional);
      
      const durationMs = Date.now() - startTime;
      logger.info('Text chunking completed successfully.', {
        totalChunks: chunks.length,
        durationMs,
        documentId: contextOptional?.documentId,
      });

      return chunks;
    } catch (error: any) {
      logger.error('Failed to complete text chunking operation.', error);
      throw error;
    }
  }
}

// Global active chunking service singleton
export const chunkingService = new ChunkingService();
