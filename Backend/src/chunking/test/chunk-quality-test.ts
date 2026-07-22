import { ChunkingService } from '../service/ChunkingService';
import * as assert from 'assert';

async function runQualityTests() {
  console.log('--- Starting Semantic Chunking Quality Assurance Tests ---');
  let passed = 0;
  let failed = 0;

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      failed++;
    }
  };

  const service = new ChunkingService();

  // Test 1: Heading/Section tagging and Page Tracking
  test('Heading, Section, and page Number extraction', () => {
    const text = `
[Page 1]
# Human Resource Handbook
This handbook establishes all core company policies.

[Page 2]
Section 2.1: Holiday Packages
We offer 25 days of annual leave.
    `;

    const chunks = service.chunkText(text, {
      maxChunkSize: 20,
      chunkOverlapSize: 2,
      tokenizerStrategy: 'word'
    });

    assert.ok(chunks.length >= 2, 'Should divide document into distinct chunks');
    
    // First chunk metadata checks
    assert.strictEqual(chunks[0].metadata.pageNumber, 1);
    assert.strictEqual(chunks[0].metadata.heading, 'Human Resource Handbook');

    // Second chunk metadata checks
    assert.strictEqual(chunks[1].metadata.pageNumber, 2);
    assert.strictEqual(chunks[1].metadata.section, 'Section 2.1: Holiday Packages');
  });

  // Test 2: Bullet Lists integrity preservation
  test('Bullet Lists should never be split across chunks', () => {
    const text = `
Here is a list of company benefits that must remain unified:
- Unlimited coffee
- Health coverage
- Gym membership reimbursement
- Extended maternity leave
- Subsidized meals
    `;

    const chunks = service.chunkText(text, {
      maxChunkSize: 50,
      chunkOverlapSize: 5,
      tokenizerStrategy: 'word'
    });

    // Check that lists are preserved
    for (const chunk of chunks) {
      if (chunk.content.includes('- Unlimited coffee')) {
        assert.ok(chunk.content.includes('- Subsidized meals'), 'Entire bullet list block should stay grouped inside a single chunk');
      }
    }
  });

  // Test 3: Table integrity preservation
  test('Table components should never be split across chunks', () => {
    const text = `
Below is structural pricing information:
| Plan | Price | Chunks |
|------|-------|--------|
| Free | $0    | 100    |
| Pro  | $15   | Unlimited |
    `;

    const chunks = service.chunkText(text, {
      maxChunkSize: 40,
      chunkOverlapSize: 5,
      tokenizerStrategy: 'word'
    });

    for (const chunk of chunks) {
      if (chunk.content.includes('| Plan | Price |')) {
        assert.ok(chunk.content.includes('| Pro  | $15   |'), 'Entire markdown table rows must be matching together');
      }
    }
  });

  // Test 4: QA pairs block groupings consistency
  test('Question-Answer pairs must not be separated', () => {
    const text = `
Q: What is the primary address of the headquarters?
A: The main headquarters is located at 100 Innovation Way, Tech Circle, CA 94016.
    `;

    const chunks = service.chunkText(text, {
      maxChunkSize: 50,
      chunkOverlapSize: 5,
      tokenizerStrategy: 'word'
    });

    for (const chunk of chunks) {
      if (chunk.content.includes('Q: What is')) {
        assert.ok(chunk.content.includes('A: The main'), 'Question and subsequent answer must remain combined');
      }
    }
  });

  // Test 5: Enhanced metadata extraction compliance (documentType, department, keywords, tags)
  test('Enhanced metadata fields should parse and map correctly', () => {
    const text = `
    This SOP document describes standard procedures for onboarding new employees.
    We require deploying servers and executing database migrations.
    Please ensure leaves, holiday allowances, and annual vacations are logged correctly.
    `;

    const chunks = service.chunkText(text, {
      maxChunkSize: 100,
      chunkOverlapSize: 10,
      tokenizerStrategy: 'word'
    }, {
      documentId: 'doc-metadata',
      filename: 'project_onboarding_sop.pdf'
    });

    assert.strictEqual(chunks.length, 1);
    const meta = chunks[0].metadata;

    assert.strictEqual(meta.documentType, 'SOP');
    assert.strictEqual(meta.department, 'Operations');
    assert.ok(meta.keywords && meta.keywords.length > 0, 'Keywords list should not be empty');
    assert.ok(meta.tags && meta.tags.includes('sop'), 'Tags list should include category tag');
    assert.ok(meta.tags.includes('leave-policy') || meta.tags.includes('benefits'), 'Tags list should include vacation tags');
  });

  console.log(`\n--- Quality Test Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runQualityTests().catch(err => {
  console.error(err);
  process.exit(1);
});
