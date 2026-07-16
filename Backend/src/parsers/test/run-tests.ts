import { ParserFactory } from '../factory/ParserFactory';
import { MimeDetector } from '../utils/mime';
import { 
  UnsupportedFileTypeError, 
  EmptyDocumentError
} from '../errors/parser.errors';
import * as assert from 'assert';

/**
 * Automated test runner verifying core Strategy Pattern constraints,
 * format detection rules, and fallback exceptions.
 */
async function runTests() {
  console.log('--- Starting Document Parser Service Unit Tests ---');
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

  // Test 1: MimeDetector
  await test('MimeDetector should detect PDF from buffer & extension', () => {
    const pdfBuf = Buffer.from('%PDF-1.4\n...');
    const result = MimeDetector.detect(pdfBuf, 'test.pdf');
    assert.strictEqual(result.mimeType, 'application/pdf');
    assert.strictEqual(result.extension, 'pdf');
  });

  await test('MimeDetector should detect TXT from plain characters', () => {
    const txtBuf = Buffer.from('Hello world! This is raw printable ASCII text.');
    const result = MimeDetector.detect(txtBuf, 'notes.txt');
    assert.strictEqual(result.mimeType, 'text/plain');
    assert.strictEqual(result.extension, 'txt');
  });

  // Test 2: ParserFactory selection
  await test('ParserFactory should select PdfParser for PDF format', () => {
    const parser = ParserFactory.getParser('pdf', 'application/pdf');
    assert.strictEqual(parser.constructor.name, 'PdfParser');
  });

  await test('ParserFactory should throw UnsupportedFileTypeError for unknown format', () => {
    assert.throws(() => {
      ParserFactory.getParser('exe', 'application/octet-stream');
    }, UnsupportedFileTypeError);
  });

  // Test 3: TxtParser
  await test('TxtParser should parse plain text correctly', async () => {
    const txtBuf = Buffer.from('Line 1\nLine 2\n\nParagraph 2');
    const parser = ParserFactory.getParser('txt', 'text/plain');
    const parsed = await parser.parse(txtBuf, { filename: 'sample.txt' });

    assert.strictEqual(parsed.parserUsed, 'native-buffer');
    assert.strictEqual(parsed.metadata.filename, 'sample.txt');
    assert.strictEqual(parsed.metadata.extension, 'txt');
    assert.ok(parsed.extractedText.includes('Line 1'));
    assert.strictEqual(parsed.paragraphs?.length, 2);
    assert.strictEqual(parsed.metadata.lineCount, 4);
  });

  // Test 4: Empty Document Exception
  await test('Parser should throw EmptyDocumentError for empty buffer', async () => {
    const parser = ParserFactory.getParser('txt', 'text/plain');
    await assert.rejects(async () => {
      await parser.parse(Buffer.alloc(0));
    }, EmptyDocumentError);
  });

  console.log(`\n--- Test Results: ${passedCount} passed, ${failedCount} failed ---`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
