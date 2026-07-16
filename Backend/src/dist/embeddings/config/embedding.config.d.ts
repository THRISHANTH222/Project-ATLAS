export interface EmbeddingServiceConfig {
    apiKey: string;
    model: string;
    batchSize: number;
    maxRetries: number;
    retryDelayMs: number;
    timeoutMs: number;
    concurrencyLimit: number;
    storageProvider: string;
}
/**
 * Loads, overrides, and validates embedding configuration options from env.
 * Throws clean ConfigurationError during startup on rule violations.
 */
export declare function loadAndValidateConfig(): EmbeddingServiceConfig;
export declare const embeddingConfig: EmbeddingServiceConfig;
//# sourceMappingURL=embedding.config.d.ts.map