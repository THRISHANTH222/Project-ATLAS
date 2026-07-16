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
const ChunkingService_1 = require("../service/ChunkingService");
const sentenceSplitter_1 = require("../utils/sentenceSplitter");
const chunk_errors_1 = require("../errors/chunk.errors");
const assert = __importStar(require("assert"));
/**
 * Custom unit test suite exercising text chunker constraints.
 */
async function runChunkingTests() {
    console.log('--- Starting Text Chunking Service Unit Tests ---');
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
    const chunkerService = new ChunkingService_1.ChunkingService();
    // Test 1: SentenceSplitter abbreviation checks
    await test('SentenceSplitter should ignore abbreviations and keep quoted text grouped', () => {
        const text = 'Mr. Smith visited the U.S. last month. He said, "I like coding." Then he left.';
        const sentences = sentenceSplitter_1.SentenceSplitter.split(text);
        assert.strictEqual(sentences.length, 3);
        assert.strictEqual(sentences[0], 'Mr. Smith visited the U.S. last month.');
        assert.strictEqual(sentences[1], 'He said, "I like coding."');
        assert.strictEqual(sentences[2], 'Then he left.');
    });
    // Test 2: Chunk size limits
    await test('ChunkingService should group sentences without exceeding max size', () => {
        const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
        const chunks = chunkerService.chunkText(text, {
            maxChunkSize: 30,
            chunkOverlapSize: 0,
            minChunkSize: 5,
            tokenizerStrategy: 'character',
        });
        assert.ok(chunks.length > 1);
        for (const chunk of chunks) {
            assert.ok(chunk.content.length <= 30);
            assert.strictEqual(chunk.metadata.totalChunks, chunks.length);
        }
    });
    // Test 3: Overlap checks
    await test('ChunkingService should include overlap between chunk slices', () => {
        const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
        const chunks = chunkerService.chunkText(text, {
            maxChunkSize: 45,
            chunkOverlapSize: 35,
            minChunkSize: 5,
            tokenizerStrategy: 'character',
        });
        assert.ok(chunks.length > 1);
        // The second chunk should include parts of the first chunk
        assert.ok(chunks[1].content.includes('Sentence two'));
    });
    // Test 4: Fallback word splitting
    await test('ChunkingService should fall back to word-splitting for extra long sentences', () => {
        const text = 'This Is An Extremely Long Sentence Without Any Punctuation That Exceeds The Max Size Limit.';
        const chunks = chunkerService.chunkText(text, {
            maxChunkSize: 20,
            chunkOverlapSize: 5,
            minChunkSize: 2,
            tokenizerStrategy: 'character',
        });
        assert.ok(chunks.length > 1);
        for (const chunk of chunks) {
            assert.ok(chunk.content.length <= 20);
        }
    });
    // Test 5: Metadata verification
    await test('ChunkingService should output rich strongly-typed metadata properties', () => {
        const text = 'Hello world. Welcome to the chunking system.';
        const chunks = chunkerService.chunkText(text, {
            maxChunkSize: 100,
            chunkOverlapSize: 10,
            minChunkSize: 5,
            tokenizerStrategy: 'character',
        }, {
            documentId: 'doc-123',
            filename: 'info.txt',
            parserSource: 'txt-parser',
        });
        assert.strictEqual(chunks.length, 1);
        const meta = chunks[0].metadata;
        assert.strictEqual(meta.documentId, 'doc-123');
        assert.strictEqual(meta.filename, 'info.txt');
        assert.strictEqual(meta.parserSource, 'txt-parser');
        assert.strictEqual(meta.characterCount, chunks[0].content.length);
        assert.ok(meta.estimatedTokenCount > 0);
    });
    // Test 6: Empty input exception check
    await test('ChunkingService should throw EmptyInputError on empty text content', async () => {
        await assert.rejects(async () => {
            chunkerService.chunkText('');
        }, chunk_errors_1.EmptyInputError);
    });
    console.log(`\n--- Chunking Test Results: ${passedCount} passed, ${failedCount} failed ---`);
    if (failedCount > 0) {
        process.exit(1);
    }
}
runChunkingTests().catch(err => {
    console.error('Fatal chunker test runner failure:', err);
    process.exit(1);
});
//# sourceMappingURL=run-tests.js.map