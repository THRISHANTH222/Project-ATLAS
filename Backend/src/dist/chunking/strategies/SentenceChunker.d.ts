import { Chunker } from '../interfaces/Chunker';
import { Chunk, ChunkingConfig } from '../types/chunk.types';
/**
 * Concrete chunker strategy grouping sentences using a sliding window.
 * Falls back to word-boundary splitting for sentences exceeding maximum chunk sizes.
 */
export declare class SentenceChunker implements Chunker {
    /**
     * Chunks text into structured slices preserving sentence and paragraph integrity.
     * @param text Raw text input.
     * @param config Chunk configurations.
     * @param contextOptional Context fields for document metadata.
     */
    chunk(text: string, config: ChunkingConfig, contextOptional?: {
        documentId?: string;
        filename?: string;
        parserSource?: string;
    }): Chunk[];
    /**
     * Helper to slice exceptionally long sentences by word boundaries.
     */
    private chunkLongSentence;
}
//# sourceMappingURL=SentenceChunker.d.ts.map