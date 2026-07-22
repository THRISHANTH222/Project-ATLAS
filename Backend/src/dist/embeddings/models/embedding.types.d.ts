import { ChunkMetadata } from '../../chunking/types/chunk.types';
/**
 * Processing status lifecycle states for embedding documents.
 */
export declare enum EmbeddingStatus {
    PENDING = "Pending",
    PROCESSING = "Processing",
    COMPLETED = "Completed",
    FAILED = "Failed"
}
/**
 * Metadata parameters saved along with each vector embedding.
 */
export interface EmbeddingMetadata {
    embeddingId: string;
    companyId: string;
    documentId: string;
    chunkId: string;
    chunkIndex: number;
    embeddingModel: string;
    embeddingDimensions: number;
    filename?: string;
    parserSource?: string;
    chunkMetadata: ChunkMetadata;
    documentType?: string;
    department?: string;
    heading?: string;
    section?: string;
    pageNumber?: number;
    keywords?: string[];
    tags?: string[];
    createdAt: string;
    status: EmbeddingStatus;
    failureReason?: string;
}
/**
 * DB record structure representing a generated embedding and its vector.
 */
export interface EmbeddingRecord {
    embeddingId: string;
    companyId: string;
    documentId: string;
    chunkId: string;
    chunkIndex: number;
    embeddingVector: number[];
    metadata: EmbeddingMetadata;
}
//# sourceMappingURL=embedding.types.d.ts.map