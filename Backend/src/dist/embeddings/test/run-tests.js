"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const batching_1 = require("../utils/batching");
const retry_1 = require("../utils/retry");
const EmbeddingService_1 = require("../service/EmbeddingService");
const embedding_types_1 = require("../models/embedding.types");
const assert = __importStar(require("assert"));
class MockEmbeddingProvider {
    callsCount = 0;
    failCount = 0;
    getDimensions() {
        return 768;
    }
    async generateEmbeddings(texts) {
        this.callsCount++;
        if (this.failCount > 0) {
            this.failCount--;
            throw new Error('Transient connection issue');
        }
        return texts.map(() => new Array(768).fill(0.15));
    }
}
class MockEmbeddingRepository {
    savedRecords = [];
    statuses = [];
    async saveEmbedding(record) {
        this.savedRecords.push(record);
    }
    async saveMany(records) {
        this.savedRecords.push(...records);
    }
    async updateStatus(companyId, documentId, status, failureReason) {
        this.statuses.push({ documentId, status, reason: failureReason });
    }
    async deleteByDocument(companyId, documentId) {
        this.savedRecords = this.savedRecords.filter(r => r.documentId !== documentId);
    }
    async getEmbedding(companyId, embeddingId) {
        const r = this.savedRecords.find(x => x.embeddingId === embeddingId);
        return r && r.companyId === companyId ? r : null;
    }
    async getDocumentEmbeddings(companyId, documentId) {
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
    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`[PASS] ${name}`);
            passedCount++;
        }
        catch (err) {
            console.error(`[FAIL] ${name}:`, err);
            failedCount++;
        }
    };
    // Test 1: Batch partitioning
    await test('Batching should slice datasets into correct batch sizes', () => {
        const items = [10, 20, 30, 40, 50];
        const sliced = batching_1.Batching.slice(items, 2);
        assert.strictEqual(sliced.length, 3);
        assert.deepStrictEqual(sliced[0], [10, 20]);
        assert.deepStrictEqual(sliced[2], [50]);
    });
    // Test 2: Retry backoff algorithm
    await test('retryWithBackoff should retry on failure and eventually resolve', async () => {
        let attempts = 0;
        const result = await (0, retry_1.retryWithBackoff)(async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error('Transient API failure');
            }
            return 'done';
        }, {
            maxRetries: 3,
            initialDelayMs: 1,
            factor: 1.2,
        });
        assert.strictEqual(result, 'done');
        assert.strictEqual(attempts, 3);
    });
    // Test 3: Standard success flow
    await test('EmbeddingService should generate records and commit status updates', async () => {
        const provider = new MockEmbeddingProvider();
        const repository = new MockEmbeddingRepository();
        const service = new EmbeddingService_1.EmbeddingService(provider, repository, { batchSize: 2 });
        const chunks = [
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
        const records = await service.embedChunks('comp-100', 'doc-200', chunks, 'sample.docx', 'docx-parser');
        assert.strictEqual(records.length, 2);
        assert.strictEqual(repository.savedRecords.length, 2);
        assert.strictEqual(provider.callsCount, 1); // 1 batch of size 2
        const statusTrace = repository.statuses.map(s => s.status);
        assert.deepStrictEqual(statusTrace, [
            embedding_types_1.EmbeddingStatus.PENDING,
            embedding_types_1.EmbeddingStatus.PROCESSING,
            embedding_types_1.EmbeddingStatus.COMPLETED,
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
        const service = new EmbeddingService_1.EmbeddingService(provider, repository, { maxRetries: 2, retryDelayMs: 1 });
        const chunks = [
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
        assert.ok(statusTrace.includes(embedding_types_1.EmbeddingStatus.FAILED));
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
//# sourceMappingURL=run-tests.js.map