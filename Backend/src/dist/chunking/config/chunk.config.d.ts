import { ChunkingConfig } from '../types/chunk.types';
/**
 * Parses and validates text chunking configurations from environment variables.
 * Enforces rule relationships (e.g. overlap < size) and fails fast on startup.
 */
export declare function loadAndValidateConfig(): ChunkingConfig;
export declare const chunkingConfig: ChunkingConfig;
//# sourceMappingURL=chunk.config.d.ts.map