/**
 * Strategy interface contract for vector embedding generator providers.
 */
export interface EmbeddingProvider {
  /**
   * Converts a batch of texts into multi-dimensional vectors.
   * @param texts An array of string text chunks.
   * @returns Array of embedding vectors (number[][]).
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Returns the vector dimension count (e.g. 768 for text-embedding-004).
   */
  getDimensions(): number;
}
