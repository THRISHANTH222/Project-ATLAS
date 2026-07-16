"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleEmbeddingProvider = void 0;
const generative_ai_1 = require("@google/generative-ai");
const embedding_errors_1 = require("../errors/embedding.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('GoogleEmbeddingProvider');
/**
 * Concrete EmbeddingProvider for Google Gemini models using the official SDK.
 */
class GoogleEmbeddingProvider {
    ai;
    modelName;
    /**
     * Initializes GoogleEmbeddingProvider.
     * @param apiKey The Google Gemini API key.
     * @param modelName The target embedding model (default text-embedding-004).
     */
    constructor(apiKey, modelName = 'text-embedding-004') {
        if (!apiKey || apiKey === 'mock-gemini-key') {
            // In non-prod environments without keys, fallback safely to prevent crash
            logger.warn('Google Embedding Provider initialized with mock api key.');
        }
        this.ai = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
    }
    /**
     * Returns vector length dimensions (text-embedding-004 defaults to 768).
     */
    getDimensions() {
        return 768;
    }
    /**
     * Requests vector representation for an array of texts.
     * Map status codes to specific custom errors.
     */
    async generateEmbeddings(texts) {
        if (!texts || texts.length === 0) {
            return [];
        }
        try {
            const model = this.ai.getGenerativeModel({ model: this.modelName });
            logger.debug(`Invoking Gemini batchEmbedContents...`, { count: texts.length });
            const response = await model.batchEmbedContents({
                requests: texts.map(text => ({
                    content: { role: 'user', parts: [{ text }] }
                }))
            });
            if (!response || !response.embeddings) {
                throw new embedding_errors_1.EmbeddingApiError('Google AI SDK returned an empty or invalid response envelope.');
            }
            return response.embeddings.map((emb, index) => {
                const vector = emb.values || emb.value;
                if (!vector || !Array.isArray(vector)) {
                    throw new embedding_errors_1.EmbeddingApiError(`No valid vector array returned at position index ${index}`);
                }
                return vector;
            });
        }
        catch (error) {
            logger.error('Failed to generate embeddings from Google API.', error);
            const errMsg = error.message || '';
            if (errMsg.includes('API_KEY_INVALID') ||
                errMsg.includes('key not valid') ||
                errMsg.includes('API key not found')) {
                throw new embedding_errors_1.EmbeddingAuthError('Authentication to Google AI API failed. Invalid API Key.', error);
            }
            if (errMsg.includes('429') ||
                errMsg.includes('Quota exceeded') ||
                errMsg.includes('RESOURCE_EXHAUSTED') ||
                errMsg.includes('rate limit')) {
                if (errMsg.includes('quota') || errMsg.includes('limit exceeded')) {
                    throw new embedding_errors_1.EmbeddingQuotaError('Google AI API quota limit exhausted.', error);
                }
                throw new embedding_errors_1.EmbeddingRateLimitError('Google AI API request rate limit reached.', error);
            }
            throw new embedding_errors_1.EmbeddingApiError('An error occurred during call execution to Google AI API.', error);
        }
    }
}
exports.GoogleEmbeddingProvider = GoogleEmbeddingProvider;
//# sourceMappingURL=GoogleEmbeddingProvider.js.map