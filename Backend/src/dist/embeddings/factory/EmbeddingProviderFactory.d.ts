import { EmbeddingProvider } from '../interfaces/EmbeddingProvider';
/**
 * Factory class resolving and configuring vector embedding providers.
 * Manages caching for reusable singletons and test dependency injection.
 */
export declare class EmbeddingProviderFactory {
    private static providerInstance;
    /**
     * Retrieves the registered EmbeddingProvider singleton.
     */
    static getProvider(): EmbeddingProvider;
    /**
     * Overrides or resets the cached provider instance.
     * Useful for mocking API clients during unit tests.
     * @param provider Alternative EmbeddingProvider instance.
     */
    static setProvider(provider: EmbeddingProvider | null): void;
}
//# sourceMappingURL=EmbeddingProviderFactory.d.ts.map