import { Chunker } from '../interfaces/Chunker';
import { Chunk, ChunkingConfig } from '../types/chunk.types';
/**
 * Service coordinating document chunking operations.
 * Supports partial parameter overrides and wraps timings and structural logs.
 */
export declare class ChunkingService {
    private readonly chunker;
    /**
     * Initializes ChunkingService.
     * Supports injecting alternative strategies to follow Dependency Injection (DI) principles.
     * @param chunker Optional chunking strategy. Defaults to SentenceChunker.
     */
    constructor(chunker?: Chunker);
    /**
     * Slices raw text content into standard chunks.
     * @param text Raw document text.
     * @param configOverride Custom override rules.
     * @param contextOptional Extra descriptor columns for chunk metadata context.
     * @throws EmptyInputError if text is invalid.
     */
    chunkText(text: string, configOverride?: Partial<ChunkingConfig>, contextOptional?: {
        documentId?: string;
        filename?: string;
        parserSource?: string;
    }): Chunk[];
}
export declare const chunkingService: ChunkingService;
//# sourceMappingURL=ChunkingService.d.ts.map