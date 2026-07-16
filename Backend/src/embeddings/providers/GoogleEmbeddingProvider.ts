import { EmbeddingProvider } from '../interfaces/EmbeddingProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  EmbeddingApiError, 
  EmbeddingAuthError, 
  EmbeddingRateLimitError, 
  EmbeddingQuotaError 
} from '../errors/embedding.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('GoogleEmbeddingProvider');

/**
 * Concrete EmbeddingProvider for Google Gemini models using the official SDK.
 */
export class GoogleEmbeddingProvider implements EmbeddingProvider {
  private readonly ai: GoogleGenerativeAI;
  private readonly modelName: string;

  /**
   * Initializes GoogleEmbeddingProvider.
   * @param apiKey The Google Gemini API key.
   * @param modelName The target embedding model (default text-embedding-004).
   */
  constructor(apiKey: string, modelName: string = 'text-embedding-004') {
    if (!apiKey || apiKey === 'mock-gemini-key') {
      // In non-prod environments without keys, fallback safely to prevent crash
      logger.warn('Google Embedding Provider initialized with mock api key.');
    }
    this.ai = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  /**
   * Returns vector length dimensions (text-embedding-004 defaults to 768).
   */
  public getDimensions(): number {
    return 768;
  }

  /**
   * Requests vector representation for an array of texts.
   * Map status codes to specific custom errors.
   */
  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
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
        throw new EmbeddingApiError('Google AI SDK returned an empty or invalid response envelope.');
      }

      return response.embeddings.map((emb: any, index: number) => {
        const vector = emb.values || emb.value;
        if (!vector || !Array.isArray(vector)) {
          throw new EmbeddingApiError(`No valid vector array returned at position index ${index}`);
        }
        return vector;
      });
    } catch (error: any) {
      logger.error('Failed to generate embeddings from Google API.', error);
      
      const errMsg = error.message || '';
      
      if (
        errMsg.includes('API_KEY_INVALID') || 
        errMsg.includes('key not valid') || 
        errMsg.includes('API key not found')
      ) {
        throw new EmbeddingAuthError('Authentication to Google AI API failed. Invalid API Key.', error);
      }
      
      if (
        errMsg.includes('429') || 
        errMsg.includes('Quota exceeded') || 
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('rate limit')
      ) {
        if (errMsg.includes('quota') || errMsg.includes('limit exceeded')) {
          throw new EmbeddingQuotaError('Google AI API quota limit exhausted.', error);
        }
        throw new EmbeddingRateLimitError('Google AI API request rate limit reached.', error);
      }
      
      throw new EmbeddingApiError('An error occurred during call execution to Google AI API.', error);
    }
  }
}
