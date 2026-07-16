import { ChunkingService } from '../service/ChunkingService';
import { SentenceSplitter } from '../utils/sentenceSplitter';
import { EmptyInputError } from '../errors/chunk.errors';
import * as assert from 'assert';

/**
 * Custom unit test suite exercising text chunker constraints.
 */
async function runChunkingTests() {
  console.log('--- Starting Text Chunking Service Unit Tests ---');
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

  const chunkerService = new ChunkingService();

  // Test 1: SentenceSplitter abbreviation checks
  await test('SentenceSplitter should ignore abbreviations and keep quoted text grouped', () => {
    const text = 'Mr. Smith visited the U.S. last month. He said, "I like coding." Then he left.';
    const sentences = SentenceSplitter.split(text);
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
    }, EmptyInputError);
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
