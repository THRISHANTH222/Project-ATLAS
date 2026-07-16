/**
 * Tokenizer utility providing token count approximations
 * suitable for standard LLM context window boundaries.
 */
export declare class Tokenizer {
    /**
     * Estimates token counts using standard heuristics (approx. 4 characters or 0.75 words per token).
     * @param text The input text segment.
     * @param strategy The metric unit strategy.
     */
    static estimateTokens(text: string, strategy?: 'character' | 'word' | 'token'): number;
    /**
     * Measures text length based on the selected tokenizer unit.
     * @param text Text value.
     * @param strategy Unit measurement strategy.
     */
    static measureLength(text: string, strategy: 'character' | 'word' | 'token'): number;
}
//# sourceMappingURL=tokenizer.d.ts.map