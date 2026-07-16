"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingProviderFactory = void 0;
const GoogleEmbeddingProvider_1 = require("../providers/GoogleEmbeddingProvider");
const embedding_config_1 = require("../config/embedding.config");
/**
 * Factory class resolving and configuring vector embedding providers.
 * Manages caching for reusable singletons and test dependency injection.
 */
class EmbeddingProviderFactory {
    static providerInstance = null;
    /**
     * Retrieves the registered EmbeddingProvider singleton.
     */
    static getProvider() {
        if (!this.providerInstance) {
            this.providerInstance = new GoogleEmbeddingProvider_1.GoogleEmbeddingProvider(embedding_config_1.embeddingConfig.apiKey, embedding_config_1.embeddingConfig.model);
        }
        return this.providerInstance;
    }
    /**
     * Overrides or resets the cached provider instance.
     * Useful for mocking API clients during unit tests.
     * @param provider Alternative EmbeddingProvider instance.
     */
    static setProvider(provider) {
        this.providerInstance = provider;
    }
}
exports.EmbeddingProviderFactory = EmbeddingProviderFactory;
//# sourceMappingURL=EmbeddingProviderFactory.js.map