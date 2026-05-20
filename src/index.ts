interface WithRetryOptions {
  retries?: number;
  delay?: number;
}

/**
 * Calls `fn` and retries on failure with exponential backoff.
 * If the operation was cancelled via an AbortSignal, the error is propagated immediately and no retry is attempted.
 *
 * @param fn - Function to execute. Can be sync or async.
 * @param options.retries - Maximum number of retry attempts. Default: `3`.
 * @param options.delay - Initial delay in milliseconds between retries (doubles each attempt). Default: `500`.
 */
export async function withRetry<T>(
  fn: () => T | Promise<T>,
  { retries = 3, delay = 500 }: WithRetryOptions = {},
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;

    if (retries === 0) throw err;

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Each retry doubles the delay time
    return withRetry(fn, { retries: retries - 1, delay: delay * 2 });
  }
}
