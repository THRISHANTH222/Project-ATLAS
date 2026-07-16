import { EmbeddingProvider } from '../interfaces/EmbeddingProvider';
import { GoogleEmbeddingProvider } from '../providers/GoogleEmbeddingProvider';
import { embeddingConfig } from '../config/embedding.config';

/**
 * Factory class resolving and configuring vector embedding providers.
 * Manages caching for reusable singletons and test dependency injection.
 */
export class EmbeddingProviderFactory {
  private static providerInstance: EmbeddingProvider | null = null;

  /**
   * Retrieves the registered EmbeddingProvider singleton.
   */
  public static getProvider(): EmbeddingProvider {
    if (!this.providerInstance) {
      this.providerInstance = new GoogleEmbeddingProvider(
        embeddingConfig.apiKey,
        embeddingConfig.model
      );
    }
    return this.providerInstance;
  }

  /**
   * Overrides or resets the cached provider instance.
   * Useful for mocking API clients during unit tests.
   * @param provider Alternative EmbeddingProvider instance.
   */
  public static setProvider(provider: EmbeddingProvider | null): void {
    this.providerInstance = provider;
  }
}
