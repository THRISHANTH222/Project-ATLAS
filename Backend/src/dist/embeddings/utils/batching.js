"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Batching = void 0;
/**
 * Utility helper to segment datasets into small batches.
 */
class Batching {
    /**
     * Partitions an array into multiple smaller chunks of a maximum size.
     * Preserves item ordering.
     * @param items Original items list.
     * @param maxBatchSize Max length of each sub-array slice.
     */
    static slice(items, maxBatchSize) {
        if (!items || items.length === 0) {
            return [];
        }
        const batches = [];
        for (let i = 0; i < items.length; i += maxBatchSize) {
            batches.push(items.slice(i, i + maxBatchSize));
        }
        return batches;
    }
}
exports.Batching = Batching;
//# sourceMappingURL=batching.js.map