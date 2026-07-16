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
const knowledge_types_1 = require("../models/knowledge.types");
const KnowledgeIndexService_1 = require("../services/KnowledgeIndexService");
const knowledge_errors_1 = require("../errors/knowledge.errors");
const assert = __importStar(require("assert"));
class MockKnowledgeRepository {
    docs = [];
    chunks = [];
    async createDocument(doc) {
        this.docs.push(doc);
    }
    async getDocument(companyId, documentId) {
        const d = this.docs.find(x => x.documentId === documentId);
        return d && d.companyId === companyId && !d.deletedAt ? d : null;
    }
    async getDocumentByChecksum(companyId, checksum) {
        const d = this.docs.find(x => x.checksum === checksum && x.companyId === companyId && !x.deletedAt);
        return d || null;
    }
    async updateDocument(companyId, documentId, updates) {
        const index = this.docs.findIndex(x => x.documentId === documentId && x.companyId === companyId);
        if (index !== -1) {
            this.docs[index] = { ...this.docs[index], ...updates };
        }
    }
    async softDeleteDocument(companyId, documentId) {
        await this.updateDocument(companyId, documentId, {
            deletedAt: new Date().toISOString(),
        });
    }
    async hardDeleteDocument(companyId, documentId) {
        this.docs = this.docs.filter(x => !(x.documentId === documentId && x.companyId === companyId));
    }
    async listDocuments(companyId, options) {
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
    async registerChunks(chunks) {
        this.chunks.push(...chunks);
    }
    async getDocumentChunks(companyId, documentId) {
        return this.chunks.filter(x => x.companyId === companyId && x.documentId === documentId);
    }
    async deleteChunksByDocument(companyId, documentId) {
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
    // Test 1: Document registration and checksum duplicates
    await test('KnowledgeIndexService should register metadata and block checksum duplicates', async () => {
        const repository = new MockKnowledgeRepository();
        const service = new KnowledgeIndexService_1.KnowledgeIndexService(repository);
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
            status: knowledge_types_1.ProcessingStatus.UPLOADED,
        };
        const doc = await service.registerDocument('comp-2', 'doc-100', docDto);
        assert.strictEqual(doc.documentId, 'doc-100');
        assert.strictEqual(doc.companyId, 'comp-2');
        assert.strictEqual(doc.health, knowledge_types_1.HealthStatus.HEALTHY);
        await assert.rejects(async () => {
            await service.registerDocument('comp-2', 'doc-101', docDto);
        }, knowledge_errors_1.DuplicateDocumentError);
    });
    // Test 2: Status transitions
    await test('KnowledgeIndexService should validate transitions and state constraints', async () => {
        const repository = new MockKnowledgeRepository();
        const service = new KnowledgeIndexService_1.KnowledgeIndexService(repository);
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
            status: knowledge_types_1.ProcessingStatus.UPLOADED,
        };
        await service.registerDocument('comp-2', 'doc-100', docDto);
        // Uploaded -> Parsing is valid
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.PARSING);
        let doc = await service.getDocument('comp-2', 'doc-100');
        assert.strictEqual(doc.status, knowledge_types_1.ProcessingStatus.PARSING);
        // Parsing -> Completed is invalid
        await assert.rejects(async () => {
            await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.COMPLETED);
        }, knowledge_errors_1.InvalidStatusTransitionError);
    });
    // Test 3: Computed Health Checks
    await test('KnowledgeIndexService should calculate and persist health metrics', async () => {
        const repository = new MockKnowledgeRepository();
        const service = new KnowledgeIndexService_1.KnowledgeIndexService(repository);
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
            status: knowledge_types_1.ProcessingStatus.UPLOADED,
        };
        await service.registerDocument('comp-2', 'doc-100', docDto);
        // Register 2 chunk metadata records to align with totalChunks
        await service.registerDocumentChunks('comp-2', 'doc-100', [
            { chunkId: 'c-0', chunkIndex: 0, totalChunks: 2, startOffset: 0, endOffset: 10, characterCount: 10, wordCount: 2, estimatedTokenCount: 3, embeddingStatus: 'Completed' },
            { chunkId: 'c-1', chunkIndex: 1, totalChunks: 2, startOffset: 11, endOffset: 20, characterCount: 9, wordCount: 2, estimatedTokenCount: 3, embeddingStatus: 'Completed' }
        ]);
        // Advance status to Completed
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.PARSING);
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.PARSED);
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.CHUNKING);
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.CHUNKED);
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.EMBEDDING);
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.EMBEDDED);
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.INDEXING);
        await service.updateStatus('comp-2', 'doc-100', knowledge_types_1.ProcessingStatus.COMPLETED);
        let report = await service.calculateDocumentHealth('comp-2', 'doc-100');
        assert.strictEqual(report.health, knowledge_types_1.HealthStatus.HEALTHY);
        assert.strictEqual(report.issues.length, 0);
        // Induce vector mismatch -> Health WARNING
        await repository.updateDocument('comp-2', 'doc-100', { totalEmbeddings: 1 });
        report = await service.calculateDocumentHealth('comp-2', 'doc-100');
        assert.strictEqual(report.health, knowledge_types_1.HealthStatus.WARNING);
        assert.ok(report.issues[0].includes('Embedding mismatch'));
    });
    // Test 4: Logical Soft Delete
    await test('KnowledgeIndexService should logically flag registry records as deleted', async () => {
        const repository = new MockKnowledgeRepository();
        const service = new KnowledgeIndexService_1.KnowledgeIndexService(repository);
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
            status: knowledge_types_1.ProcessingStatus.UPLOADED,
        };
        await service.registerDocument('comp-2', 'doc-del', docDto);
        await service.softDeleteDocument('comp-2', 'doc-del');
        // Retrieve should fail with DocumentNotFoundError
        await assert.rejects(async () => {
            await service.getDocument('comp-2', 'doc-del');
        }, knowledge_errors_1.KnowledgeDocumentNotFoundError);
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
//# sourceMappingURL=run-tests.js.map