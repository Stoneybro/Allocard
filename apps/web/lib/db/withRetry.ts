/**
 * Retry a database operation on transient Neon connection failures.
 * The Neon serverless HTTP driver can intermittently lose connections
 * (DNS, cold starts, network jitter). This wraps any async DB op with
 * up to 3 retries and exponential backoff.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 400;

/** Neon transient errors to retry on */
function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  // Neon serverless driver error patterns
  return (
    msg.includes("fetch failed") ||
    msg.includes("connection") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("socket") ||
    msg.includes("network") ||
    msg.includes("unreachable") ||
    msg.includes("dns") ||
    msg.includes("etimedout") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("504")
  );
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
