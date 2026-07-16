/**
 * Metadata descriptor associated with a single text chunk.
 */
export interface ChunkMetadata {
    chunkId: string;
    chunkIndex: number;
    totalChunks: number;
    documentId?: string;
    filename?: string;
    startOffset: number;
    endOffset: number;
    characterCount: number;
    wordCount: number;
    estimatedTokenCount: number;
    overlapStart?: number;
    overlapEnd?: number;
    parserSource?: string;
    createdAt: string;
}
/**
 * Standard envelope representation of an extracted text chunk.
 */
export interface Chunk {
    chunkId: string;
    content: string;
    metadata: ChunkMetadata;
}
/**
 * Validated configurations for text chunking operations.
 */
export interface ChunkingConfig {
    maxChunkSize: number;
    chunkOverlapSize: number;
    minChunkSize: number;
    tokenizerStrategy: 'character' | 'word' | 'token';
}
//# sourceMappingURL=chunk.types.d.ts.map