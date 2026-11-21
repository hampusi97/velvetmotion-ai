/** Fetch with hard timeout + bounded retry. Throws a descriptive Error on final failure. */
export interface RetryOptions {
  timeoutMs?: number;
  attempts?: number;
  label?: string;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOptions = {},
): Promise<Response> {
  const { timeoutMs = 45_000, attempts = 3, label = "request" } = opts;
  let lastError: Error = new Error(`${label}: no attempt made`);

  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const onOuterAbort = () => ctrl.abort();
    if (opts.signal?.aborted) {
      ctrl.abort();
    } else {
      opts.signal?.addEventListener("abort", onOuterAbort);
    }

    let res: Response | null = null;
    try {
      res = await fetch(url, { ...init, signal: ctrl.signal });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(`${label}: ${String(err)}`);
      if (opts.signal?.aborted) throw lastError;
      if (i === attempts - 1) throw lastError;
      await sleep(900 * 2 ** i + Math.random() * 400);
      continue;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onOuterAbort);
    }

    if (res.ok) return res;

    const retryable = res.status === 429 || res.status >= 500;
    lastError = new Error(`${label}: HTTP ${res.status}`);
    if (!retryable || i === attempts - 1) throw lastError;

    const retryAfter = Number(res.headers.get("retry-after"));
    const wait =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 15_000)
        : 900 * 2 ** i + Math.random() * 400;
    await sleep(wait);
  }
  throw lastError;
}
