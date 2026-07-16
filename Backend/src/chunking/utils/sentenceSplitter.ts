/**
 * Utility class to detect sentence boundaries in text block inputs.
 * Employs negative lookbehinds to prevent splits on common corporate and personal abbreviations.
 */
export class SentenceSplitter {
  private static readonly ABBREVIATIONS_PATTERN =
    '(?:mr|mrs|ms|dr|prof|sr|jr|inc|corp|co|ltd|e\\.g|i\\.e|vs|etc|u\\.s|u\\.k|a\\.m|p\\.m|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)';

  /**
   * Splits text into sentences. Preserves quoted dialogs and avoids breaking on abbreviations.
   * @param text Original document body text.
   */
  public static split(text: string): string[] {
    if (!text) return [];

    // Matches terminal punctuation (. ! ?) followed by whitespace or end-of-string,
    // including optional closing quotes, ignoring matches prefixed with abbreviations.
    const regex = new RegExp(
      `(?<!\\b${this.ABBREVIATIONS_PATTERN})([\\.\\!\\?]+[\\x22\\u201D\\u201C']*)(?=\\s+|$)`,
      'gi'
    );

    const sentences: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const endOfSentence = match.index + match[0].length;
      const sentence = text.substring(lastIndex, endOfSentence).trim();
      if (sentence.length > 0) {
        sentences.push(sentence);
      }
      lastIndex = endOfSentence;
    }

    // Append any trailing string fragment
    const remaining = text.substring(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push(remaining);
    }

    return sentences;
  }
}
