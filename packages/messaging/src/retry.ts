export interface RetryOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  onError?: (error: unknown, attempt: number, nextDelayMs: number) => void;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryUntilSuccess<T>(
  operation: () => Promise<T>,
  { initialDelayMs = 1000, maxDelayMs = 30_000, onError, signal }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (signal?.aborted) throw error;
      const delay = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
      onError?.(error, attempt, delay);
      await sleep(delay);
    }
  }
}
