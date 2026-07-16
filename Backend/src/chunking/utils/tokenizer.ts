/**
 * Tokenizer utility providing token count approximations
 * suitable for standard LLM context window boundaries.
 */
export class Tokenizer {
  /**
   * Estimates token counts using standard heuristics (approx. 4 characters or 0.75 words per token).
   * @param text The input text segment.
   * @param strategy The metric unit strategy.
   */
  public static estimateTokens(text: string, strategy: 'character' | 'word' | 'token' = 'token'): number {
    if (!text) return 0;

    switch (strategy) {
      case 'character':
        return text.length;
      case 'word':
        return text.trim().split(/\s+/).filter(Boolean).length;
      case 'token':
      default:
        // OpenAI character heuristic: ~4 characters per token
        const charEstimate = Math.ceil(text.length / 4);
        
        // OpenAI word heuristic: ~1.3 tokens per word (or word / 0.75)
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        const wordEstimate = Math.ceil(wordCount / 0.75);

        // Max estimate prevents underestimation for dense texts
        return Math.max(charEstimate, wordEstimate);
    }
  }

  /**
   * Measures text length based on the selected tokenizer unit.
   * @param text Text value.
   * @param strategy Unit measurement strategy.
   */
  public static measureLength(text: string, strategy: 'character' | 'word' | 'token'): number {
    return this.estimateTokens(text, strategy);
  }
}
