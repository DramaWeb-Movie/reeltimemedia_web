type FetchWithBudgetOptions = {
  timeoutMs: number;
  retries?: number;
  retryDelayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithBudget(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithBudgetOptions
): Promise<Response> {
  const retries = Math.max(0, options.retries ?? 0);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 150);

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Retry only on upstream transient failures.
      if (response.status >= 500 && response.status <= 599 && attempt < retries) {
        attempt += 1;
        await sleep(retryDelayMs * attempt);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt >= retries) break;
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('fetchWithBudget failed');
}
