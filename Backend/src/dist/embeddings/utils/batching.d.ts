/**
 * Utility helper to segment datasets into small batches.
 */
export declare class Batching {
    /**
     * Partitions an array into multiple smaller chunks of a maximum size.
     * Preserves item ordering.
     * @param items Original items list.
     * @param maxBatchSize Max length of each sub-array slice.
     */
    static slice<T>(items: T[], maxBatchSize: number): T[][];
}
//# sourceMappingURL=batching.d.ts.map