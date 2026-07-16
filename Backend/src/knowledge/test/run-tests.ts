import { KnowledgeDocument, KnowledgeChunk, ProcessingStatus, HealthStatus } from '../models/knowledge.types';
import { KnowledgeRepository, ListDocumentsOptions } from '../interfaces/KnowledgeRepository.interface';
import { KnowledgeIndexService } from '../services/KnowledgeIndexService';
import { 
  InvalidStatusTransitionError, 
  KnowledgeDocumentNotFoundError,
  DuplicateDocumentError
} from '../errors/knowledge.errors';
import * as assert from 'assert';

class MockKnowledgeRepository implements KnowledgeRepository {
  public docs: KnowledgeDocument[] = [];
  public chunks: KnowledgeChunk[] = [];

  public async createDocument(doc: KnowledgeDocument): Promise<void> {
    this.docs.push(doc);
  }

  public async getDocument(companyId: string, documentId: string): Promise<KnowledgeDocument | null> {
    const d = this.docs.find(x => x.documentId === documentId);
    return d && d.companyId === companyId && !d.deletedAt ? d : null;
  }

  public async getDocumentByChecksum(companyId: string, checksum: string): Promise<KnowledgeDocument | null> {
    const d = this.docs.find(x => x.checksum === checksum && x.companyId === companyId && !x.deletedAt);
    return d || null;
  }

  public async updateDocument(
    companyId: string,
    documentId: string,
    updates: Partial<KnowledgeDocument>
  ): Promise<void> {
    const index = this.docs.findIndex(x => x.documentId === documentId && x.companyId === companyId);
    if (index !== -1) {
      this.docs[index] = { ...this.docs[index], ...updates };
    }
  }

  public async softDeleteDocument(companyId: string, documentId: string): Promise<void> {
    await this.updateDocument(companyId, documentId, {
      deletedAt: new Date().toISOString(),
    });
  }

  public async hardDeleteDocument(companyId: string, documentId: string): Promise<void> {
    this.docs = this.docs.filter(x => !(x.documentId === documentId && x.companyId === companyId));
  }

  public async listDocuments(
    companyId: string,
    options: ListDocumentsOptions
  ): Promise<{ items: KnowledgeDocument[]; lastVisibleSnapshot: any }> {
    let list = this.docs.filter(x => x.companyId === companyId && !x.deletedAt);
    if (options.status) {
      list = list.filter(x => x.status === options.status);
    }
    if (options.health) {
      list = list.filter(x => x.health === options.health);
    }
    if (options.searchFilename) {
      const term = options.searchFilename.toLowerCase();
      list = list.filter(x => x.filename.toLowerCase().includes(term));
    }
    return {
      items: list,
      lastVisibleSnapshot: null,
    };
  }

  public async registerChunks(chunks: KnowledgeChunk[]): Promise<void> {
    this.chunks.push(...chunks);
  }

  public async getDocumentChunks(companyId: string, documentId: string): Promise<KnowledgeChunk[]> {
    return this.chunks.filter(x => x.companyId === companyId && x.documentId === documentId);
  }

  public async deleteChunksByDocument(companyId: string, documentId: string): Promise<void> {
    this.chunks = this.chunks.filter(x => x.documentId !== documentId);
  }
}

/**
 * Unit test runner for Knowledge Index Service structures.
 */
async function runKnowledgeTests() {
  console.log('--- Starting Knowledge Index Service Unit Tests ---');
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

  // Test 1: Document registration and checksum duplicates
  await test('KnowledgeIndexService should register metadata and block checksum duplicates', async () => {
    const repository = new MockKnowledgeRepository();
    const service = new KnowledgeIndexService(repository);

    const docDto = {
      filename: 'tax_return.pdf',
      originalFilename: 'tax_return_2025.pdf',
      fileExtension: 'pdf',
      mimeType: 'application/pdf',
      storagePath: '/uploads/comp-2/tax_return.pdf',
      totalPages: 4,
      totalCharacters: 4500,
      totalWords: 1100,
      totalChunks: 3,
      totalEmbeddings: 0,
      checksum: 'hash-xyz-987',
      status: ProcessingStatus.UPLOADED,
    };

    const doc = await service.registerDocument('comp-2', 'doc-100', docDto);
    assert.strictEqual(doc.documentId, 'doc-100');
    assert.strictEqual(doc.companyId, 'comp-2');
    assert.strictEqual(doc.health, HealthStatus.HEALTHY);

    await assert.rejects(async () => {
      await service.registerDocument('comp-2', 'doc-101', docDto);
    }, DuplicateDocumentError);
  });

  // Test 2: Status transitions
  await test('KnowledgeIndexService should validate transitions and state constraints', async () => {
    const repository = new MockKnowledgeRepository();
    const service = new KnowledgeIndexService(repository);

    const docDto = {
      filename: 'tax_return.pdf',
      originalFilename: 'tax_return_2025.pdf',
      fileExtension: 'pdf',
      mimeType: 'application/pdf',
      storagePath: '/uploads/comp-2/tax_return.pdf',
      totalPages: 4,
      totalCharacters: 4500,
      totalWords: 1100,
      totalChunks: 3,
      totalEmbeddings: 0,
      checksum: 'hash-xyz-987',
      status: ProcessingStatus.UPLOADED,
    };

    await service.registerDocument('comp-2', 'doc-100', docDto);

    // Uploaded -> Parsing is valid
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.PARSING);
    let doc = await service.getDocument('comp-2', 'doc-100');
    assert.strictEqual(doc.status, ProcessingStatus.PARSING);

    // Parsing -> Completed is invalid
    await assert.rejects(async () => {
      await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.COMPLETED);
    }, InvalidStatusTransitionError);
  });

  // Test 3: Computed Health Checks
  await test('KnowledgeIndexService should calculate and persist health metrics', async () => {
    const repository = new MockKnowledgeRepository();
    const service = new KnowledgeIndexService(repository);

    const docDto = {
      filename: 'tax_return.pdf',
      originalFilename: 'tax_return_2025.pdf',
      fileExtension: 'pdf',
      mimeType: 'application/pdf',
      storagePath: '/uploads/comp-2/tax_return.pdf',
      totalPages: 4,
      totalCharacters: 4500,
      totalWords: 1100,
      totalChunks: 0,
      totalEmbeddings: 2,
      checksum: 'hash-xyz-987',
      status: ProcessingStatus.UPLOADED,
    };

    await service.registerDocument('comp-2', 'doc-100', docDto);

    // Register 2 chunk metadata records to align with totalChunks
    await service.registerDocumentChunks('comp-2', 'doc-100', [
      { chunkId: 'c-0', chunkIndex: 0, totalChunks: 2, startOffset: 0, endOffset: 10, characterCount: 10, wordCount: 2, estimatedTokenCount: 3, embeddingStatus: 'Completed' },
      { chunkId: 'c-1', chunkIndex: 1, totalChunks: 2, startOffset: 11, endOffset: 20, characterCount: 9, wordCount: 2, estimatedTokenCount: 3, embeddingStatus: 'Completed' }
    ]);

    // Advance status to Completed
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.PARSING);
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.PARSED);
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.CHUNKING);
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.CHUNKED);
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.EMBEDDING);
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.EMBEDDED);
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.INDEXING);
    await service.updateStatus('comp-2', 'doc-100', ProcessingStatus.COMPLETED);

    let report = await service.calculateDocumentHealth('comp-2', 'doc-100');
    assert.strictEqual(report.health, HealthStatus.HEALTHY);
    assert.strictEqual(report.issues.length, 0);

    // Induce vector mismatch -> Health WARNING
    await repository.updateDocument('comp-2', 'doc-100', { totalEmbeddings: 1 });
    report = await service.calculateDocumentHealth('comp-2', 'doc-100');
    assert.strictEqual(report.health, HealthStatus.WARNING);
    assert.ok(report.issues[0].includes('Embedding mismatch'));
  });

  // Test 4: Logical Soft Delete
  await test('KnowledgeIndexService should logically flag registry records as deleted', async () => {
    const repository = new MockKnowledgeRepository();
    const service = new KnowledgeIndexService(repository);

    const docDto = {
      filename: 'waste.txt',
      originalFilename: 'waste.txt',
      fileExtension: 'txt',
      mimeType: 'text/plain',
      storagePath: '/uploads/comp-2/waste.txt',
      totalPages: 1,
      totalCharacters: 10,
      totalWords: 2,
      totalChunks: 1,
      totalEmbeddings: 0,
      checksum: 'hash-del',
      status: ProcessingStatus.UPLOADED,
    };

    await service.registerDocument('comp-2', 'doc-del', docDto);
    await service.softDeleteDocument('comp-2', 'doc-del');

    // Retrieve should fail with DocumentNotFoundError
    await assert.rejects(async () => {
      await service.getDocument('comp-2', 'doc-del');
    }, KnowledgeDocumentNotFoundError);
  });

  console.log(`\n--- Knowledge Test Results: ${passedCount} passed, ${failedCount} failed ---`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runKnowledgeTests().catch(err => {
  console.error('Fatal knowledge test runner failure:', err);
  process.exit(1);
});
