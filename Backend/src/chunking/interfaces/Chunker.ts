import { Chunk, ChunkingConfig } from '../types/chunk.types';

/**
 * Interface that all text chunking strategies must implement.
 * Ensures consistent inputs and standardized chunk metadata envelopes.
 */
export interface Chunker {
  /**
   * Slices a text document into ordered chunks.
   * @param text Raw source text to chunk.
   * @param config Target size and overlap rules.
   * @param contextOptional Additional context fields for metadata traceability.
   */
  chunk(
    text: string,
    config: ChunkingConfig,
    contextOptional?: { documentId?: string; filename?: string; parserSource?: string }
  ): Chunk[];
}
