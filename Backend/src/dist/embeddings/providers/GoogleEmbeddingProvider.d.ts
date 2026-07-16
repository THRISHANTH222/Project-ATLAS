import { EmbeddingProvider } from '../interfaces/EmbeddingProvider';
/**
 * Concrete EmbeddingProvider for Google Gemini models using the official SDK.
 */
export declare class GoogleEmbeddingProvider implements EmbeddingProvider {
    private readonly ai;
    private readonly modelName;
    /**
     * Initializes GoogleEmbeddingProvider.
     * @param apiKey The Google Gemini API key.
     * @param modelName The target embedding model (default text-embedding-004).
     */
    constructor(apiKey: string, modelName?: string);
    /**
     * Returns vector length dimensions (text-embedding-004 defaults to 768).
     */
    getDimensions(): number;
    /**
     * Requests vector representation for an array of texts.
     * Map status codes to specific custom errors.
     */
    generateEmbeddings(texts: string[]): Promise<number[][]>;
}
//# sourceMappingURL=GoogleEmbeddingProvider.d.ts.map