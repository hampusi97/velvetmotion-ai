/** Fetch with hard timeout + bounded retry. Throws a descriptive Error on final failure. */
export interface RetryOptions {
  timeoutMs?: number;
  attempts?: number;
  label?: string;
  signal?: AbortSignal;
}

const BODY_RETRY_AFTER_RE = /Retry after\s+(\d+(?:\.\d+)?)\s*s/i;

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise((r) => setTimeout(r, ms));
  if (signal.aborted) {
    return Promise.reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

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
      await abortableSleep(900 * 2 ** i + Math.random() * 400, opts.signal);
      continue;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onOuterAbort);
    }

    if (res.ok) return res;

    // HTTP 402 is used by Pollinations FREE_LIMIT ("Retry after Ns") alongside standard 429/5xx.
    const retryable = res.status === 402 || res.status === 429 || res.status >= 500;
    lastError = new Error(`${label}: HTTP ${res.status}`);
    if (!retryable || i === attempts - 1) throw lastError;

    const retryAfter = Number(res.headers.get("retry-after"));
    let waitMs = 900 * 2 ** i + Math.random() * 400;
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      waitMs = Math.min(retryAfter * 1000, 46_000);
    } else if (res.status === 402 || res.status === 429) {
      const errText = await res.text().catch(() => "");
      const bodyMatch = BODY_RETRY_AFTER_RE.exec(errText);
      if (bodyMatch) {
        const parsedSec = Number(bodyMatch[1]);
        if (Number.isFinite(parsedSec) && parsedSec > 0) {
          waitMs = Math.min((parsedSec + 1.5) * 1000, 46_000);
        }
      }
    }
    await abortableSleep(waitMs, opts.signal);
  }
  throw lastError;
}
