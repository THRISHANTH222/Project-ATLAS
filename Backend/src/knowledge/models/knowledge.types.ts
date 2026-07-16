/**
 * Document processing lifecycle status states.
 */
export enum ProcessingStatus {
  UPLOADED = 'Uploaded',
  PARSING = 'Parsing',
  PARSED = 'Parsed',
  CHUNKING = 'Chunking',
  CHUNKED = 'Chunked',
  EMBEDDING = 'Embedding',
  EMBEDDED = 'Embedded',
  INDEXING = 'Indexing',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  ARCHIVED = 'Archived'
}

/**
 * Health indicator metrics.
 */
export enum HealthStatus {
  HEALTHY = 'Healthy',
  WARNING = 'Warning',
  ERROR = 'Error'
}

/**
 * Normalized database schema for registered knowledge documents.
 */
export interface KnowledgeDocument {
  documentId: string;
  companyId: string;
  filename: string;
  originalFilename: string;
  fileExtension: string;
  mimeType: string;
  storagePath: string;
  parserUsed?: string;
  parserVersion?: string;
  uploadTimestamp: string;
  processedTimestamp?: string;
  totalPages: number;
  totalCharacters: number;
  totalWords: number;
  totalChunks: number;
  totalEmbeddings: number;
  processingDuration?: number;
  checksum: string;
  status: ProcessingStatus;
  health: HealthStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null; // soft delete support
}

/**
 * Normalized lightweight schema for knowledge chunks.
 */
export interface KnowledgeChunk {
  chunkId: string;
  documentId: string;
  companyId: string;
  chunkIndex: number;
  totalChunks: number;
  startOffset: number;
  endOffset: number;
  wordCount: number;
  characterCount: number;
  estimatedTokenCount: number;
  embeddingStatus: 'Pending' | 'Completed' | 'Failed';
  createdAt: string;
}
