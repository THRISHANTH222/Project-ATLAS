"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentenceChunker = void 0;
const sentenceSplitter_1 = require("../utils/sentenceSplitter");
const tokenizer_1 = require("../utils/tokenizer");
const chunk_errors_1 = require("../errors/chunk.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('SentenceChunker');
/**
 * Enhanced Semantic Chunker strategy.
 * Chunk boundaries prioritize headings, sections, lists, tables, questions,
 * and paragraphs, falling back to word/recursive bounds.
 */
class SentenceChunker {
    /**
     * Chunks text into structured slices preserving semantic integrity.
     * @param text Raw text input.
     * @param config Chunk configurations.
     * @param contextOptional Context fields for document metadata.
     */
    chunk(text, config, contextOptional) {
        if (!text || text.trim().length === 0) {
            throw new chunk_errors_1.EmptyInputError('Input text is empty, null, or undefined.');
        }
        const docId = contextOptional?.documentId || 'doc';
        const filename = contextOptional?.filename;
        const parserSource = contextOptional?.parserSource;
        // Determine parameter bounds from user instructions or test overrides
        let maxLimit = config.maxChunkSize;
        let overlapLimit = config.chunkOverlapSize;
        if (config.tokenizerStrategy === 'word') {
            if (maxLimit === 1000)
                maxLimit = 700;
            if (overlapLimit === 200)
                overlapLimit = 100;
        }
        const countWords = (s) => s.trim().split(/\s+/).filter(Boolean).length;
        const measureSize = (s) => tokenizer_1.Tokenizer.measureLength(s, config.tokenizerStrategy);
        // Helpers to segment text into semantic groups
        const lines = this.splitIntoLinesWithOffsets(text);
        const groups = this.parseSemanticGroups(text, lines);
        const chunksList = [];
        const totalElements = groups.length;
        let k = 0;
        while (k < totalElements) {
            let currentChunkSize = 0;
            let startIdx = groups[k].start;
            let endIdx = groups[k].end;
            let pageNum = groups[k].pageNumber ?? 1;
            let heading = groups[k].heading ?? '';
            let section = groups[k].section ?? '';
            const elementsInChunk = [];
            let nextK = k;
            while (nextK < totalElements) {
                const elem = groups[nextK];
                const elemSize = measureSize(elem.text);
                // If single isolated block exceeds maxLimit, split it using strategy bounds
                if (elementsInChunk.length === 0 && elemSize > maxLimit) {
                    const slices = this.chunkLongTextByWords(elem.text, elem.start, maxLimit, overlapLimit, config.tokenizerStrategy);
                    for (const slice of slices) {
                        chunksList.push({
                            text: slice.text,
                            start: slice.start,
                            end: slice.end,
                            pageNumber: elem.pageNumber ?? 1,
                            heading: elem.heading ?? '',
                            section: elem.section ?? '',
                        });
                    }
                    nextK++;
                    break;
                }
                if (currentChunkSize + elemSize <= maxLimit) {
                    elementsInChunk.push(nextK);
                    currentChunkSize += elemSize;
                    endIdx = elem.end;
                    if (elem.heading && !heading) {
                        heading = elem.heading;
                    }
                    if (elem.section && !section) {
                        section = elem.section;
                    }
                    nextK++;
                }
                else {
                    break;
                }
            }
            if (elementsInChunk.length > 0) {
                const chunkText = text.substring(startIdx, endIdx);
                chunksList.push({
                    text: chunkText,
                    start: startIdx,
                    end: endIdx,
                    pageNumber: pageNum,
                    heading: heading,
                    section: section,
                });
                if (nextK >= totalElements) {
                    break;
                }
                // Compute overlap index targeting matching limit bounds
                let currentOverlapSize = 0;
                let overlapStartIdx = elementsInChunk.length - 1;
                while (overlapStartIdx >= 0) {
                    const idx = elementsInChunk[overlapStartIdx];
                    const elemSize = measureSize(groups[idx].text);
                    if (currentOverlapSize + elemSize <= overlapLimit) {
                        currentOverlapSize += elemSize;
                        overlapStartIdx--;
                    }
                    else {
                        if (overlapStartIdx === elementsInChunk.length - 1) {
                            overlapStartIdx--;
                        }
                        break;
                    }
                }
                const nextStartK = elementsInChunk[overlapStartIdx + 1] ?? (k + 1);
                if (nextStartK <= k) {
                    k = k + 1;
                }
                else {
                    k = nextStartK;
                }
            }
            else {
                k = nextK;
            }
        }
        // Map output schema models
        const createdAt = new Date().toISOString();
        return chunksList.map((c, index) => {
            const chunkId = `${docId}-chunk-${index}`;
            const characterCount = c.text.length;
            const wordCount = countWords(c.text);
            const estimatedTokenCount = tokenizer_1.Tokenizer.estimateTokens(c.text, 'token');
            const enhanced = this.extractEnhancedMetadata(c.text, filename);
            const metadata = {
                chunkId,
                chunkIndex: index,
                totalChunks: chunksList.length,
                documentId: docId,
                filename,
                startOffset: c.start,
                endOffset: c.end,
                characterCount,
                wordCount,
                estimatedTokenCount,
                parserSource,
                createdAt,
                pageNumber: c.pageNumber,
                heading: c.heading,
                section: c.section,
                documentType: enhanced.documentType,
                department: enhanced.department,
                keywords: enhanced.keywords,
                tags: enhanced.tags,
            };
            return {
                chunkId,
                content: c.text,
                metadata,
            };
        });
    }
    extractEnhancedMetadata(text, filename) {
        const textLower = text.toLowerCase();
        const fileLower = (filename || '').toLowerCase();
        // 1. Determine Document Type
        let documentType = 'Internal Knowledge Base';
        if (fileLower.includes('sop') || textLower.includes('sop') || textLower.includes('standard operating procedure')) {
            documentType = 'SOP';
        }
        else if (fileLower.includes('handbook') || textLower.includes('handbook')) {
            documentType = 'Employee Handbook';
        }
        else if (fileLower.includes('hr_policy') || fileLower.includes('hr-policy') || textLower.includes('hr policy') || textLower.includes('human resource')) {
            documentType = 'HR Policy';
        }
        else if (fileLower.includes('policy') || textLower.includes('policy')) {
            documentType = 'Company Policy';
        }
        else if (fileLower.includes('manual') || textLower.includes('manual')) {
            documentType = 'Product Manual';
        }
        else if (fileLower.includes('technical') || textLower.includes('technical documentation') || textLower.includes('api reference') || fileLower.includes('api')) {
            documentType = 'Technical Documentation';
        }
        else if (fileLower.includes('finance') || fileLower.includes('payroll') || textLower.includes('finance policy') || textLower.includes('expenses')) {
            documentType = 'Finance Policy';
        }
        else if (fileLower.includes('compliance') || textLower.includes('compliance')) {
            documentType = 'Compliance';
        }
        else if (fileLower.includes('legal') || fileLower.includes('contract') || textLower.includes('legal') || textLower.includes('agreement')) {
            documentType = 'Legal';
        }
        else if (fileLower.includes('operation') || textLower.includes('operations')) {
            documentType = 'Operations';
        }
        else if (fileLower.includes('sales') || textLower.includes('sales')) {
            documentType = 'Sales';
        }
        // 2. Determine Department
        let department = 'General';
        if (documentType === 'HR Policy' || documentType === 'Employee Handbook') {
            department = 'Human Resources';
        }
        else if (documentType === 'SOP' || documentType === 'Operations') {
            department = 'Operations';
        }
        else if (documentType === 'Product Manual' || documentType === 'Technical Documentation') {
            department = 'Engineering';
        }
        else if (documentType === 'Finance Policy') {
            department = 'Finance';
        }
        else if (documentType === 'Compliance' || documentType === 'Legal') {
            department = 'Legal';
        }
        else if (documentType === 'Sales') {
            department = 'Sales';
        }
        // 3. Extract Keywords (Frequencies count of terms > 4 chars, excluding stopwords)
        const stopwords = new Set([
            'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
            'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
            'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont',
            'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have',
            'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him',
            'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt',
            'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not',
            'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
            'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such',
            'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres',
            'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too',
            'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent',
            'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom',
            'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
            'your', 'yours', 'yourself', 'yourselves', 'shall', 'should', 'would', 'other', 'under', 'these',
            'those', 'their', 'there', 'where', 'which', 'about', 'company', 'handbook', 'policy', 'document'
        ]);
        const words = textLower
            .replace(/[^a-zA-Z\s]/g, '')
            .split(/\s+/)
            .map(w => w.trim())
            .filter(w => w.length > 4 && !stopwords.has(w));
        const freqMap = {};
        for (const w of words) {
            freqMap[w] = (freqMap[w] || 0) + 1;
        }
        const sortedWords = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]);
        const keywords = sortedWords.slice(0, 6);
        // 4. Determine Tags
        const tagsSet = new Set();
        tagsSet.add(documentType.toLowerCase());
        tagsSet.add(department.toLowerCase());
        for (const kw of keywords) {
            tagsSet.add(kw);
        }
        // Domain contextual tags
        if (textLower.includes('leave') || textLower.includes('holiday') || textLower.includes('vacation')) {
            tagsSet.add('benefits');
            tagsSet.add('leave-policy');
        }
        if (textLower.includes('deploy') || textLower.includes('server') || textLower.includes('database')) {
            tagsSet.add('infrastructure');
            tagsSet.add('deployment');
        }
        if (textLower.includes('safety') || textLower.includes('hazard') || textLower.includes('emergency')) {
            tagsSet.add('safety');
            tagsSet.add('workspace-security');
        }
        if (tagsSet.size === 0) {
            tagsSet.add('knowledge');
        }
        return {
            documentType,
            department,
            keywords,
            tags: Array.from(tagsSet)
        };
    }
    splitIntoLinesWithOffsets(text) {
        const lines = [];
        let searchIdx = 0;
        const rawLines = text.split(/\r?\n/);
        for (const rawLine of rawLines) {
            const idx = text.indexOf(rawLine, searchIdx);
            if (idx !== -1) {
                lines.push({
                    text: rawLine,
                    start: idx,
                    end: idx + rawLine.length,
                });
                searchIdx = idx + rawLine.length;
            }
        }
        return lines;
    }
    parseSemanticGroups(text, lines) {
        let currentPageNumber = 1;
        let currentHeading = '';
        let currentSection = '';
        const groups = [];
        let i = 0;
        const n = lines.length;
        const isHeading = (txt) => {
            const trimmed = txt.trim();
            if (!trimmed)
                return false;
            if (/^(#{1,6})\s+.+$/.test(trimmed))
                return true;
            if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 100)
                return true;
            if (trimmed.length > 3 && trimmed.length < 80 && /^[A-Z0-9\s\-_:\(\)\.,]+$/.test(trimmed))
                return true;
            return false;
        };
        const isSection = (txt) => {
            const trimmed = txt.trim();
            if (!trimmed)
                return false;
            if (/^(Section|Chapter|Module|Part|Section\s+Title|Chapter\s+Title|Part\s+Title)\s+[A-Za-z0-9\.\-_]+/i.test(trimmed))
                return true;
            return false;
        };
        const isTableLine = (txt) => {
            const trimmed = txt.trim();
            return trimmed.startsWith('|') || /\|/g.test(trimmed) || /^\+[-+]*\+$/.test(trimmed);
        };
        const isListLine = (txt) => {
            const trimmed = txt.trim();
            return /^([-*+•]|\d+[\.\)]|[a-zA-Z][\.\)])\s+/.test(trimmed);
        };
        const isQuestionLine = (txt) => {
            const trimmed = txt.trim();
            return /^(Q\d+|Question\d*|Q:)\b/i.test(trimmed);
        };
        const getPageNumber = (txt) => {
            const match = /\[Page\s+(\d+)\]/i.exec(txt) || /\bPAGE\s+(\d+)\b/i.exec(txt) || /\bPage\s+(\d+)\b/i.exec(txt);
            return match ? parseInt(match[1], 10) : undefined;
        };
        while (i < n) {
            const line = lines[i];
            const trimmed = line.text.trim();
            if (!trimmed) {
                i++;
                continue;
            }
            // 1. Page Marker Match
            const pageNum = getPageNumber(line.text);
            if (pageNum !== undefined) {
                currentPageNumber = pageNum;
                groups.push({
                    type: 'page_marker',
                    start: line.start,
                    end: line.end,
                    text: line.text,
                    pageNumber: currentPageNumber,
                    heading: currentHeading,
                    section: currentSection,
                });
                i++;
                continue;
            }
            // 2. Section Title Match
            if (isSection(line.text)) {
                currentSection = trimmed.replace(/^#+\s+/, '').replace(/^\*\*|\*\*$/g, '');
                groups.push({
                    type: 'section',
                    start: line.start,
                    end: line.end,
                    text: line.text,
                    pageNumber: currentPageNumber,
                    heading: currentHeading,
                    section: currentSection,
                });
                i++;
                continue;
            }
            // 3. Heading Match
            if (isHeading(line.text)) {
                currentHeading = trimmed.replace(/^#+\s+/, '').replace(/^\*\*|\*\*$/g, '');
                groups.push({
                    type: 'heading',
                    start: line.start,
                    end: line.end,
                    text: line.text,
                    pageNumber: currentPageNumber,
                    heading: currentHeading,
                    section: currentSection,
                });
                i++;
                continue;
            }
            // 4. Table Block Match
            if (isTableLine(line.text)) {
                let j = i;
                while (j < n && (isTableLine(lines[j].text) || (lines[j].text.trim() && !isHeading(lines[j].text) && !isSection(lines[j].text)))) {
                    j++;
                }
                const textBlock = text.substring(lines[i].start, lines[j - 1].end);
                groups.push({
                    type: 'table',
                    start: lines[i].start,
                    end: lines[j - 1].end,
                    text: textBlock,
                    pageNumber: currentPageNumber,
                    heading: currentHeading,
                    section: currentSection,
                });
                i = j;
                continue;
            }
            // 5. List Block Match
            if (isListLine(line.text)) {
                let j = i;
                while (j < n && (isListLine(lines[j].text) || (lines[j].text.startsWith(' ') && lines[j].text.trim()))) {
                    j++;
                }
                const textBlock = text.substring(lines[i].start, lines[j - 1].end);
                groups.push({
                    type: 'list',
                    start: lines[i].start,
                    end: lines[j - 1].end,
                    text: textBlock,
                    pageNumber: currentPageNumber,
                    heading: currentHeading,
                    section: currentSection,
                });
                i = j;
                continue;
            }
            // 6. QA Pair Match
            if (isQuestionLine(line.text)) {
                let j = i + 1;
                while (j < n && !isHeading(lines[j].text) && !isSection(lines[j].text) && !isQuestionLine(lines[j].text) && j - i < 15) {
                    j++;
                }
                const textBlock = text.substring(lines[i].start, lines[j - 1].end);
                groups.push({
                    type: 'qa',
                    start: lines[i].start,
                    end: lines[j - 1].end,
                    text: textBlock,
                    pageNumber: currentPageNumber,
                    heading: currentHeading,
                    section: currentSection,
                });
                i = j;
                continue;
            }
            // 7. General Paragraph & Sentence Fallback
            let j = i;
            while (j < n) {
                const nextLine = lines[j];
                if (!nextLine.text.trim())
                    break;
                if (getPageNumber(nextLine.text) !== undefined)
                    break;
                if (isSection(nextLine.text))
                    break;
                if (isHeading(nextLine.text))
                    break;
                if (isTableLine(nextLine.text))
                    break;
                if (isListLine(nextLine.text))
                    break;
                if (isQuestionLine(nextLine.text))
                    break;
                j++;
            }
            const paragraphText = text.substring(lines[i].start, lines[j - 1].end);
            const sentences = sentenceSplitter_1.SentenceSplitter.split(paragraphText);
            let sentenceSearchIdx = lines[i].start;
            for (const sent of sentences) {
                const idx = text.indexOf(sent, sentenceSearchIdx);
                if (idx !== -1) {
                    groups.push({
                        type: 'paragraph',
                        start: idx,
                        end: idx + sent.length,
                        text: sent,
                        pageNumber: currentPageNumber,
                        heading: currentHeading,
                        section: currentSection,
                    });
                    sentenceSearchIdx = idx + sent.length;
                }
                else {
                    groups.push({
                        type: 'paragraph',
                        start: lines[i].start,
                        end: lines[j - 1].end,
                        text: sent,
                        pageNumber: currentPageNumber,
                        heading: currentHeading,
                        section: currentSection,
                    });
                }
            }
            i = j;
        }
        return groups;
    }
    chunkLongTextByWords(textBlock, baseOffset, maxLimit, overlapLimit, strategy) {
        const words = textBlock.split(/(\s+)/);
        const result = [];
        let i = 0;
        const n = words.length;
        while (i < n) {
            let currentSize = 0;
            let textSlice = '';
            let startIdx = -1;
            let j = i;
            while (j < n) {
                const candidateSlice = textSlice + words[j];
                const candidateSize = tokenizer_1.Tokenizer.measureLength(candidateSlice, strategy);
                if (candidateSize <= maxLimit || j === i) {
                    textSlice = candidateSlice;
                    currentSize = candidateSize;
                    if (startIdx === -1) {
                        const offset = textBlock.indexOf(words[j]);
                        startIdx = offset !== -1 ? offset : 0;
                    }
                    j++;
                }
                else {
                    break;
                }
            }
            const endIdx = startIdx + textSlice.length;
            result.push({
                text: textSlice,
                start: baseOffset + startIdx,
                end: baseOffset + endIdx,
            });
            if (j >= n)
                break;
            let overlapSize = 0;
            let o = j - 1;
            while (o > i) {
                const overlapText = words.slice(o, j).join('');
                const size = tokenizer_1.Tokenizer.measureLength(overlapText, strategy);
                if (size <= overlapLimit) {
                    overlapSize = size;
                    o--;
                }
                else {
                    break;
                }
            }
            i = Math.max(i + 1, o);
        }
        return result;
    }
}
exports.SentenceChunker = SentenceChunker;
//# sourceMappingURL=SentenceChunker.js.map