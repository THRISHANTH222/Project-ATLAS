export interface RetryOptions {
    maxRetries: number;
    initialDelayMs: number;
    factor?: number;
    shouldRetry?: (error: any) => boolean;
}
/**
 * Runs a promise-yielding function under an exponential backoff retry loop.
 * Bypasses retries for non-transient exceptions.
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map