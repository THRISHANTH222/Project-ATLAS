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
  pageNumber?: number;
  heading?: string;
  section?: string;
  documentType?: string;
  department?: string;
  keywords?: string[];
  tags?: string[];
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
  maxChunkSize: number;          // Target size threshold (in characters or tokens)
  chunkOverlapSize: number;      // Target overlap amount (same unit as maxChunkSize)
  minChunkSize: number;          // Minimum size below which a final slice is discarded/merged
  tokenizerStrategy: 'character' | 'word' | 'token'; // Measuring unit strategy
}
