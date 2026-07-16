import { EmbeddingProvider } from '../interfaces/EmbeddingProvider';
import { EmbeddingRepository } from '../interfaces/EmbeddingRepository';
import { Chunk } from '../../chunking/types/chunk.types';
import { EmbeddingRecord } from '../models/embedding.types';
import { EmbeddingServiceConfig } from '../config/embedding.config';
/**
 * Service orchestrating vector embedding pipelines.
 * Manages document tracking lifecycle states, API call partitioning, and storage writes.
 */
export declare class EmbeddingService {
    private readonly provider;
    private readonly repository;
    private readonly config;
    /**
     * Initializes the EmbeddingService. Supports dependency injection.
     */
    constructor(provider?: EmbeddingProvider, repository?: EmbeddingRepository, configOverride?: Partial<EmbeddingServiceConfig>);
    /**
     * Generates and persists embeddings for a list of text chunks.
     * Tracks document jobs from Pending -> Processing -> Completed.
     * @param companyId Tenant identifier.
     * @param documentId Document unique identifier.
     * @param chunks Array of parsed document chunks.
     * @param filename Document filename.
     * @param parserSource Document parsing strategy used.
     */
    embedChunks(companyId: string, documentId: string, chunks: Chunk[], filename?: string, parserSource?: string): Promise<EmbeddingRecord[]>;
}
export declare const embeddingService: EmbeddingService;
//# sourceMappingURL=EmbeddingService.d.ts.map