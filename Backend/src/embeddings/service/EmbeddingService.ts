import { EmbeddingProvider } from '../interfaces/EmbeddingProvider';
import { EmbeddingRepository } from '../interfaces/EmbeddingRepository';
import { EmbeddingProviderFactory } from '../factory/EmbeddingProviderFactory';
import { FirestoreEmbeddingRepository } from '../repository/FirestoreEmbeddingRepository';
import { Chunk } from '../../chunking/types/chunk.types';
import { 
  EmbeddingRecord, 
  EmbeddingMetadata, 
  EmbeddingStatus 
} from '../models/embedding.types';
import { 
  embeddingConfig, 
  EmbeddingServiceConfig 
} from '../config/embedding.config';
import { Batching } from '../utils/batching';
import { retryWithBackoff } from '../utils/retry';
import { 
  EmbeddingAuthError, 
  EmbeddingConfigError, 
  EmbeddingApiError, 
  EmbeddingRetryExhaustedError, 
  EmbeddingError 
} from '../errors/embedding.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('EmbeddingService');

/**
 * Service orchestrating vector embedding pipelines.
 * Manages document tracking lifecycle states, API call partitioning, and storage writes.
 */
export class EmbeddingService {
  private readonly provider: EmbeddingProvider;
  private readonly repository: EmbeddingRepository;
  private readonly config: EmbeddingServiceConfig;

  /**
   * Initializes the EmbeddingService. Supports dependency injection.
   */
  constructor(
    provider?: EmbeddingProvider,
    repository?: EmbeddingRepository,
    configOverride?: Partial<EmbeddingServiceConfig>
  ) {
    this.config = {
      apiKey: configOverride?.apiKey ?? embeddingConfig.apiKey,
      model: configOverride?.model ?? embeddingConfig.model,
      batchSize: configOverride?.batchSize ?? embeddingConfig.batchSize,
      maxRetries: configOverride?.maxRetries ?? embeddingConfig.maxRetries,
      retryDelayMs: configOverride?.retryDelayMs ?? embeddingConfig.retryDelayMs,
      timeoutMs: configOverride?.timeoutMs ?? embeddingConfig.timeoutMs,
      concurrencyLimit: configOverride?.concurrencyLimit ?? embeddingConfig.concurrencyLimit,
      storageProvider: configOverride?.storageProvider ?? embeddingConfig.storageProvider,
    };
    
    this.provider = provider || EmbeddingProviderFactory.getProvider();
    this.repository = repository || new FirestoreEmbeddingRepository();
  }

  /**
   * Generates and persists embeddings for a list of text chunks.
   * Tracks document jobs from Pending -> Processing -> Completed.
   * @param companyId Tenant identifier.
   * @param documentId Document unique identifier.
   * @param chunks Array of parsed document chunks.
   * @param filename Document filename.
   * @param parserSource Document parsing strategy used.
   */
  public async embedChunks(
    companyId: string,
    documentId: string,
    chunks: Chunk[],
    filename?: string,
    parserSource?: string
  ): Promise<EmbeddingRecord[]> {
    const startTime = Date.now();
    logger.info(`Starting embedding generation process...`, {
      companyId,
      documentId,
      chunkCount: chunks?.length,
    });

    if (!companyId || !documentId) {
      throw new EmbeddingConfigError('CompanyId and DocumentId are required parameters.');
    }

    if (!chunks || chunks.length === 0) {
      throw new EmbeddingConfigError('Text chunks list cannot be empty, null, or undefined.');
    }

    // 1. Initialize tracking lifecycle status
    await this.repository.updateStatus(companyId, documentId, EmbeddingStatus.PENDING);
    await this.repository.updateStatus(companyId, documentId, EmbeddingStatus.PROCESSING);

    try {
      const recordsToStore: EmbeddingRecord[] = [];
      const chunkBatches = Batching.slice(chunks, this.config.batchSize);
      
      const dimensions = this.provider.getDimensions();
      const modelName = this.config.model;
      const createdAt = new Date().toISOString();

      // 2. Process chunk partitions sequentially
      for (let b = 0; b < chunkBatches.length; b++) {
        const batch = chunkBatches[b];
        logger.info(`Processing batch ${b + 1}/${chunkBatches.length}...`, { size: batch.length });
        
        const texts = batch.map(c => {
          if (!c.content || c.content.trim().length === 0) {
            throw new EmbeddingConfigError(`Chunk content at index ${c.metadata.chunkIndex} is empty.`);
          }
          return c.content;
        });

        // 3. Generate vectors using exponential retry wrapper
        let vectors: number[][];
        try {
          vectors = await retryWithBackoff(
            () => this.provider.generateEmbeddings(texts),
            {
              maxRetries: this.config.maxRetries,
              initialDelayMs: this.config.retryDelayMs,
              shouldRetry: (err) => {
                // Instantly fail and abort on non-transient config/auth exceptions
                return !(err instanceof EmbeddingAuthError) && !(err instanceof EmbeddingConfigError);
              },
            }
          );
        } catch (apiError: any) {
          const detail = apiError.message || String(apiError);
          throw new EmbeddingRetryExhaustedError(
            `Failed to generate embeddings after ${this.config.maxRetries} retry attempts. Cause: ${detail}`,
            apiError
          );
        }

        if (vectors.length !== batch.length) {
          throw new EmbeddingApiError(
            `Vector alignment mismatch. Received ${vectors.length} vectors for ${batch.length} chunks.`
          );
        }

        // 4. Map vector results to database records
        const batchRecords: EmbeddingRecord[] = batch.map((chunk, idx) => {
          const embeddingId = `${companyId}-${documentId}-${chunk.chunkId}`;
          const vector = vectors[idx];

          const metadata: EmbeddingMetadata = {
            embeddingId,
            companyId,
            documentId,
            chunkId: chunk.chunkId,
            chunkIndex: chunk.metadata.chunkIndex,
            embeddingModel: modelName,
            embeddingDimensions: dimensions,
            filename,
            parserSource,
            chunkMetadata: chunk.metadata,
            createdAt,
            status: EmbeddingStatus.COMPLETED,
          };

          return {
            embeddingId,
            companyId,
            documentId,
            chunkId: chunk.chunkId,
            chunkIndex: chunk.metadata.chunkIndex,
            embeddingVector: vector,
            metadata,
          };
        });

        recordsToStore.push(...batchRecords);
      }

      // 5. Commit embeddings via storage repository
      await this.repository.saveMany(recordsToStore);

      // 6. Complete status tracking
      await this.repository.updateStatus(companyId, documentId, EmbeddingStatus.COMPLETED);
      
      const durationMs = Date.now() - startTime;
      logger.info('Embedding generation and persistence process completed successfully.', {
        durationMs,
        documentId,
        totalEmbeddings: recordsToStore.length,
      });

      return recordsToStore;
    } catch (error: any) {
      const errMsg = error.message || String(error);
      logger.error(`Embedding generation process aborted for document '${documentId}'.`, error);
      
      // Update lifecycle tracker registry to Failed
      await this.repository.updateStatus(
        companyId,
        documentId,
        EmbeddingStatus.FAILED,
        errMsg
      );

      if (error instanceof EmbeddingError) {
        throw error;
      }
      throw new EmbeddingApiError('Unexpected error occurred during embedding processing.', error);
    }
  }
}
export const embeddingService = new EmbeddingService();
