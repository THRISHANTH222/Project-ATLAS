import { Batching } from '../utils/batching';
import { retryWithBackoff } from '../utils/retry';
import { EmbeddingProvider } from '../interfaces/EmbeddingProvider';
import { EmbeddingRepository } from '../interfaces/EmbeddingRepository';
import { EmbeddingService } from '../service/EmbeddingService';
import { 
  EmbeddingRecord, 
  EmbeddingStatus 
} from '../models/embedding.types';
import { Chunk } from '../../chunking/types/chunk.types';
import * as assert from 'assert';

class MockEmbeddingProvider implements EmbeddingProvider {
  public callsCount = 0;
  public failCount = 0;
  
  public getDimensions(): number {
    return 768;
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    this.callsCount++;
    if (this.failCount > 0) {
      this.failCount--;
      throw new Error('Transient connection issue');
    }
    return texts.map(() => new Array(768).fill(0.15));
  }
}

class MockEmbeddingRepository implements EmbeddingRepository {
  public savedRecords: EmbeddingRecord[] = [];
  public statuses: { documentId: string; status: EmbeddingStatus; reason?: string }[] = [];

  public async saveEmbedding(record: EmbeddingRecord): Promise<void> {
    this.savedRecords.push(record);
  }

  public async saveMany(records: EmbeddingRecord[]): Promise<void> {
    this.savedRecords.push(...records);
  }

  public async updateStatus(
    companyId: string,
    documentId: string,
    status: EmbeddingStatus,
    failureReason?: string
  ): Promise<void> {
    this.statuses.push({ documentId, status, reason: failureReason });
  }

  public async deleteByDocument(companyId: string, documentId: string): Promise<void> {
    this.savedRecords = this.savedRecords.filter(r => r.documentId !== documentId);
  }

  public async getEmbedding(companyId: string, embeddingId: string): Promise<EmbeddingRecord | null> {
    const r = this.savedRecords.find(x => x.embeddingId === embeddingId);
    return r && r.companyId === companyId ? r : null;
  }

  public async getDocumentEmbeddings(companyId: string, documentId: string): Promise<EmbeddingRecord[]> {
    return this.savedRecords.filter(r => r.companyId === companyId && r.documentId === documentId);
  }
}

/**
 * Custom unit test suite exercising vector embedding lifecycles.
 */
async function runEmbeddingTests() {
  console.log('--- Starting Embedding Service Unit Tests ---');
  let passedCount = 0;
  let failedCount = 0;

  const test = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      failedCount++;
    }
  };

  // Test 1: Batch partitioning
  await test('Batching should slice datasets into correct batch sizes', () => {
    const items = [10, 20, 30, 40, 50];
    const sliced = Batching.slice(items, 2);
    assert.strictEqual(sliced.length, 3);
    assert.deepStrictEqual(sliced[0], [10, 20]);
    assert.deepStrictEqual(sliced[2], [50]);
  });

  // Test 2: Retry backoff algorithm
  await test('retryWithBackoff should retry on failure and eventually resolve', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient API failure');
        }
        return 'done';
      },
      {
        maxRetries: 3,
        initialDelayMs: 1,
        factor: 1.2,
      }
    );
    assert.strictEqual(result, 'done');
    assert.strictEqual(attempts, 3);
  });

  // Test 3: Standard success flow
  await test('EmbeddingService should generate records and commit status updates', async () => {
    const provider = new MockEmbeddingProvider();
    const repository = new MockEmbeddingRepository();
    const service = new EmbeddingService(provider, repository, { batchSize: 2 });

    const chunks: Chunk[] = [
      {
        chunkId: 'chunk-0',
        content: 'This is segment zero.',
        metadata: {
          chunkId: 'chunk-0',
          chunkIndex: 0,
          totalChunks: 2,
          startOffset: 0,
          endOffset: 20,
          characterCount: 20,
          wordCount: 4,
          estimatedTokenCount: 5,
          createdAt: new Date().toISOString(),
        },
      },
      {
        chunkId: 'chunk-1',
        content: 'This is segment one.',
        metadata: {
          chunkId: 'chunk-1',
          chunkIndex: 1,
          totalChunks: 2,
          startOffset: 21,
          endOffset: 41,
          characterCount: 20,
          wordCount: 4,
          estimatedTokenCount: 5,
          createdAt: new Date().toISOString(),
        },
      },
    ];

    const records = await service.embedChunks(
      'comp-100',
      'doc-200',
      chunks,
      'sample.docx',
      'docx-parser'
    );

    assert.strictEqual(records.length, 2);
    assert.strictEqual(repository.savedRecords.length, 2);
    assert.strictEqual(provider.callsCount, 1); // 1 batch of size 2

    const statusTrace = repository.statuses.map(s => s.status);
    assert.deepStrictEqual(statusTrace, [
      EmbeddingStatus.PENDING,
      EmbeddingStatus.PROCESSING,
      EmbeddingStatus.COMPLETED,
    ]);

    const first = repository.savedRecords[0];
    assert.strictEqual(first.companyId, 'comp-100');
    assert.strictEqual(first.documentId, 'doc-200');
    assert.strictEqual(first.metadata.embeddingDimensions, 768);
    assert.strictEqual(first.metadata.filename, 'sample.docx');
    assert.strictEqual(first.metadata.parserSource, 'docx-parser');
    assert.strictEqual(first.embeddingVector.length, 768);
  });

  // Test 4: Error handling and status recording
  await test('EmbeddingService should set document status to Failed on API failures', async () => {
    const provider = new MockEmbeddingProvider();
    provider.failCount = 10; // Force retry limit overflow
    
    const repository = new MockEmbeddingRepository();
    const service = new EmbeddingService(provider, repository, { maxRetries: 2, retryDelayMs: 1 });

    const chunks: Chunk[] = [
      {
        chunkId: 'chunk-0',
        content: 'Error text block.',
        metadata: {
          chunkId: 'chunk-0',
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 17,
          characterCount: 17,
          wordCount: 3,
          estimatedTokenCount: 4,
          createdAt: new Date().toISOString(),
        },
      },
    ];

    await assert.rejects(async () => {
      await service.embedChunks('comp-100', 'doc-200', chunks);
    });

    const statusTrace = repository.statuses.map(s => s.status);
    assert.ok(statusTrace.includes(EmbeddingStatus.FAILED));
  });

  console.log(`\n--- Embedding Test Results: ${passedCount} passed, ${failedCount} failed ---`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runEmbeddingTests().catch(err => {
  console.error('Fatal embedding test runner failure:', err);
  process.exit(1);
});
