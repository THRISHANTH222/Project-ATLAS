"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('RetryUtility');
/**
 * Runs a promise-yielding function under an exponential backoff retry loop.
 * Bypasses retries for non-transient exceptions.
 */
async function retryWithBackoff(fn, options) {
    const { maxRetries, initialDelayMs, factor = 2, shouldRetry = () => true } = options;
    let currentDelay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            // If we've reached max retry count, or if error is deemed non-transient, throw immediately
            if (attempt > maxRetries || !shouldRetry(error)) {
                throw error;
            }
            logger.warn(`Transient operation failed. Retrying (Attempt ${attempt}/${maxRetries}) in ${currentDelay}ms...`, { reason: error.message || String(error) });
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            currentDelay *= factor;
        }
    }
    throw new Error('Retry loop terminated unexpectedly.');
}
//# sourceMappingURL=retry.js.map