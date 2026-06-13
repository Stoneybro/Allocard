/**
 * Retry a database operation on transient Neon connection failures.
 * The Neon serverless HTTP driver can intermittently lose connections
 * (DNS, cold starts, network jitter). This wraps any async DB op with
 * up to 3 retries and exponential backoff.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 400;

/** Transient error patterns that indicate a retriable Neon connection failure. */
const TRANSIENT_PATTERNS = [
  "fetch failed",
  "error connecting to database",
  "connection",
  "timeout",
  "econnrefused",
  "econnreset",
  "socket",
  "network",
  "unreachable",
  "dns",
  "etimedout",
  "503",
  "502",
  "504",
];

/**
 * Check whether an error (or any error in its cause chain) matches a transient
 * Neon connection failure pattern.
 *
 * Drizzle wraps the real NeonDbError inside the thrown error's `.cause`, so
 * checking only the top-level message (which says "Failed query: ...") is not
 * sufficient — "fetch failed" appears one or two levels deeper.
 */
function isTransientError(err: unknown, depth = 0): boolean {
  if (depth > 5 || !(err instanceof Error)) return false;

  const msg = err.message.toLowerCase();
  if (TRANSIENT_PATTERNS.some((p) => msg.includes(p))) return true;

  // Walk the cause chain (Drizzle → NeonDbError → AggregateError → ...)
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof AggregateError) {
    // AggregateError wraps multiple errors — check each one
    return cause.errors.some((e: unknown) => isTransientError(e, depth + 1));
  }
  return isTransientError(cause, depth + 1);
}

export async function withRetry<T>(fn: () => Promise<T>, label?: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === MAX_RETRIES || !isTransientError(err)) {
        throw err;
      }

      const delay = BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[DB retry] ${label ?? "query"} attempt ${attempt + 1}/${MAX_RETRIES} failed, retrying in ${delay}ms:`,
        (err as Error).message,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
