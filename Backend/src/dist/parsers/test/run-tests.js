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
const ParserFactory_1 = require("../factory/ParserFactory");
const mime_1 = require("../utils/mime");
const parser_errors_1 = require("../errors/parser.errors");
const assert = __importStar(require("assert"));
/**
 * Automated test runner verifying core Strategy Pattern constraints,
 * format detection rules, and fallback exceptions.
 */
async function runTests() {
    console.log('--- Starting Document Parser Service Unit Tests ---');
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
    // Test 1: MimeDetector
    await test('MimeDetector should detect PDF from buffer & extension', () => {
        const pdfBuf = Buffer.from('%PDF-1.4\n...');
        const result = mime_1.MimeDetector.detect(pdfBuf, 'test.pdf');
        assert.strictEqual(result.mimeType, 'application/pdf');
        assert.strictEqual(result.extension, 'pdf');
    });
    await test('MimeDetector should detect TXT from plain characters', () => {
        const txtBuf = Buffer.from('Hello world! This is raw printable ASCII text.');
        const result = mime_1.MimeDetector.detect(txtBuf, 'notes.txt');
        assert.strictEqual(result.mimeType, 'text/plain');
        assert.strictEqual(result.extension, 'txt');
    });
    // Test 2: ParserFactory selection
    await test('ParserFactory should select PdfParser for PDF format', () => {
        const parser = ParserFactory_1.ParserFactory.getParser('pdf', 'application/pdf');
        assert.strictEqual(parser.constructor.name, 'PdfParser');
    });
    await test('ParserFactory should throw UnsupportedFileTypeError for unknown format', () => {
        assert.throws(() => {
            ParserFactory_1.ParserFactory.getParser('exe', 'application/octet-stream');
        }, parser_errors_1.UnsupportedFileTypeError);
    });
    // Test 3: TxtParser
    await test('TxtParser should parse plain text correctly', async () => {
        const txtBuf = Buffer.from('Line 1\nLine 2\n\nParagraph 2');
        const parser = ParserFactory_1.ParserFactory.getParser('txt', 'text/plain');
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
        const parser = ParserFactory_1.ParserFactory.getParser('txt', 'text/plain');
        await assert.rejects(async () => {
            await parser.parse(Buffer.alloc(0));
        }, parser_errors_1.EmptyDocumentError);
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
//# sourceMappingURL=run-tests.js.map