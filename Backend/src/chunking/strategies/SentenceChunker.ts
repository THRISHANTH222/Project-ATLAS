import { Chunker } from '../interfaces/Chunker';
import { Chunk, ChunkingConfig, ChunkMetadata } from '../types/chunk.types';
import { SentenceSplitter } from '../utils/sentenceSplitter';
import { Tokenizer } from '../utils/tokenizer';
import { EmptyInputError } from '../errors/chunk.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('SentenceChunker');

interface SentenceWithOffset {
  text: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Concrete chunker strategy grouping sentences using a sliding window.
 * Falls back to word-boundary splitting for sentences exceeding maximum chunk sizes.
 */
export class SentenceChunker implements Chunker {
  /**
   * Chunks text into structured slices preserving sentence and paragraph integrity.
   * @param text Raw text input.
   * @param config Chunk configurations.
   * @param contextOptional Context fields for document metadata.
   */
  public chunk(
    text: string,
    config: ChunkingConfig,
    contextOptional?: { documentId?: string; filename?: string; parserSource?: string }
  ): Chunk[] {
    if (!text || text.trim().length === 0) {
      throw new EmptyInputError('Input text is empty, null, or undefined.');
    }

    const docId = contextOptional?.documentId || 'doc';
    const filename = contextOptional?.filename;
    const parserSource = contextOptional?.parserSource;

    // 1. Split text into sentences and compute character offsets
    const rawSentences = SentenceSplitter.split(text);
    const sentencesWithOffsets: SentenceWithOffset[] = [];
    let searchIndex = 0;

    for (const s of rawSentences) {
      const index = text.indexOf(s, searchIndex);
      if (index !== -1) {
        sentencesWithOffsets.push({
          text: s,
          startOffset: index,
          endOffset: index + s.length,
        });
        searchIndex = index + s.length;
      }
    }

    const chunksList: { text: string; startOffset: number; endOffset: number }[] = [];
    let i = 0;
    const n = sentencesWithOffsets.length;

    // 2. Slide window grouping sentences
    while (i < n) {
      let j = i;
      let currentSize = 0;

      while (j < n) {
        const candidateText = text.substring(
          sentencesWithOffsets[i].startOffset,
          sentencesWithOffsets[j].endOffset
        );
        const candidateSize = Tokenizer.measureLength(candidateText, config.tokenizerStrategy);

        if (candidateSize <= config.maxChunkSize) {
          currentSize = candidateSize;
          j++;
        } else {
          break;
        }
      }

      // Fallback: If a single sentence exceeds maxChunkSize, slice it by word boundary
      if (j === i) {
        const longSentence = sentencesWithOffsets[i];
        logger.warn(
          `Sentence at index ${i} has size exceeding max limit. Falling back to word splitting.`,
          { size: Tokenizer.measureLength(longSentence.text, config.tokenizerStrategy) }
        );

        const wordSlices = this.chunkLongSentence(longSentence, config);
        chunksList.push(...wordSlices);
        i++;
        continue;
      }

      // Create grouped chunk
      const chunkText = text.substring(
        sentencesWithOffsets[i].startOffset,
        sentencesWithOffsets[j - 1].endOffset
      );

      chunksList.push({
        text: chunkText,
        startOffset: sentencesWithOffsets[i].startOffset,
        endOffset: sentencesWithOffsets[j - 1].endOffset,
      });

      if (j >= n) {
        break; // Reached document boundary
      }

      // Calculate sentence-level overlap starting index
      let overlapIndex = j - 1;
      while (overlapIndex > i) {
        const overlapText = text.substring(
          sentencesWithOffsets[overlapIndex].startOffset,
          sentencesWithOffsets[j - 1].endOffset
        );
        const overlapSize = Tokenizer.measureLength(overlapText, config.tokenizerStrategy);

        if (overlapSize <= config.chunkOverlapSize) {
          overlapIndex--;
        } else {
          overlapIndex = overlapIndex + 1; // Step back to last valid
          break;
        }
      }

      // Prevent infinite loops by advancing at least one index
      if (overlapIndex <= i) {
        i = i + 1;
      } else {
        i = overlapIndex;
      }
    }

    // 3. Assemble and map standard chunk envelopes
    const createdAt = new Date().toISOString();
    const finalChunks: Chunk[] = chunksList.map((c, index) => {
      const chunkId = `${docId}-chunk-${index}`;
      const characterCount = c.text.length;
      const wordCount = c.text.trim().split(/\s+/).filter(Boolean).length;
      const estimatedTokenCount = Tokenizer.estimateTokens(c.text, 'token');

      const metadata: ChunkMetadata = {
        chunkId,
        chunkIndex: index,
        totalChunks: chunksList.length,
        documentId: docId,
        filename,
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        characterCount,
        wordCount,
        estimatedTokenCount,
        parserSource,
        createdAt,
      };

      return {
        chunkId,
        content: c.text,
        metadata,
      };
    });

    return finalChunks;
  }

  /**
   * Helper to slice exceptionally long sentences by word boundaries.
   */
  private chunkLongSentence(
    sentence: SentenceWithOffset,
    config: ChunkingConfig
  ): { text: string; startOffset: number; endOffset: number }[] {
    const words = sentence.text.split(/(\s+)/); // Preserve whitespaces
    const slices: { text: string; startOffset: number; endOffset: number }[] = [];
    
    let i = 0;
    const n = words.length;

    while (i < n) {
      let j = i;
      let currentText = '';

      while (j < n) {
        const candidateText = currentText + words[j];
        const candidateSize = Tokenizer.measureLength(candidateText, config.tokenizerStrategy);

        if (candidateSize <= config.maxChunkSize || j === i) {
          currentText = candidateText;
          j++;
        } else {
          break;
        }
      }

      // Resolve offset of the slice relative to the full text
      const sentenceOffset = sentence.text.indexOf(currentText);
      const startOffset = sentence.startOffset + (sentenceOffset !== -1 ? sentenceOffset : 0);
      const endOffset = startOffset + currentText.length;

      slices.push({
        text: currentText,
        startOffset,
        endOffset,
      });

      if (j >= n) {
        break;
      }

      // Word level overlap calculation
      let overlapIndex = j - 1;
      while (overlapIndex > i) {
        const overlapText = words.slice(overlapIndex, j).join('');
        const overlapSize = Tokenizer.measureLength(overlapText, config.tokenizerStrategy);

        if (overlapSize <= config.chunkOverlapSize) {
          overlapIndex--;
        } else {
          overlapIndex = overlapIndex + 1;
          break;
        }
      }

      if (overlapIndex <= i) {
        i = i + 1;
      } else {
        i = overlapIndex;
      }
    }

    return slices;
  }
}
