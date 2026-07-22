import { Chunker } from '../interfaces/Chunker';
import { Chunk, ChunkingConfig } from '../types/chunk.types';
/**
 * Enhanced Semantic Chunker strategy.
 * Chunk boundaries prioritize headings, sections, lists, tables, questions,
 * and paragraphs, falling back to word/recursive bounds.
 */
export declare class SentenceChunker implements Chunker {
    /**
     * Chunks text into structured slices preserving semantic integrity.
     * @param text Raw text input.
     * @param config Chunk configurations.
     * @param contextOptional Context fields for document metadata.
     */
    chunk(text: string, config: ChunkingConfig, contextOptional?: {
        documentId?: string;
        filename?: string;
        parserSource?: string;
    }): Chunk[];
    private extractEnhancedMetadata;
    private splitIntoLinesWithOffsets;
    private parseSemanticGroups;
    private chunkLongTextByWords;
}
//# sourceMappingURL=SentenceChunker.d.ts.map