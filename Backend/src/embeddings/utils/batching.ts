/**
 * Utility helper to segment datasets into small batches.
 */
export class Batching {
  /**
   * Partitions an array into multiple smaller chunks of a maximum size.
   * Preserves item ordering.
   * @param items Original items list.
   * @param maxBatchSize Max length of each sub-array slice.
   */
  public static slice<T>(items: T[], maxBatchSize: number): T[][] {
    if (!items || items.length === 0) {
      return [];
    }

    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += maxBatchSize) {
      batches.push(items.slice(i, i + maxBatchSize));
    }
    return batches;
  }
}
