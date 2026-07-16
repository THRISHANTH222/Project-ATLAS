/**
 * Utility class to detect sentence boundaries in text block inputs.
 * Employs negative lookbehinds to prevent splits on common corporate and personal abbreviations.
 */
export declare class SentenceSplitter {
    private static readonly ABBREVIATIONS_PATTERN;
    /**
     * Splits text into sentences. Preserves quoted dialogs and avoids breaking on abbreviations.
     * @param text Original document body text.
     */
    static split(text: string): string[];
}
//# sourceMappingURL=sentenceSplitter.d.ts.map