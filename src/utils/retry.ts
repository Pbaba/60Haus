/**
 * Retry Utility — 60Haus
 *
 * Generic retry wrapper with exponential backoff and jitter.
 * Designed for network operations that may transiently fail.
 */

const RETRYABLE_PATTERNS = ['network', 'timeout', 'fetch', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Retry an async operation with exponential backoff and jitter.
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay between retries in ms (default: 1000)
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry non-network errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs * 0.5;
      const delay = exponentialDelay + jitter;

      if (__DEV__) {
        console.log(
          `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms`,
          error instanceof Error ? error.message : error,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
