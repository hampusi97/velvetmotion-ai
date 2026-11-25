import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "./netRetry";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetchWithRetry", () => {
  it("retries a 429 then succeeds", async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "0.01" },
        });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", { method: "GET" }, { attempts: 3, label: "test" });
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });

  it("gives up after attempts", async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      return new Response("server error", {
        status: 503,
        headers: { "retry-after": "0.01" },
      });
    }) as typeof fetch;

    await assert.rejects(
      fetchWithRetry("https://example.test/api", { method: "GET" }, { attempts: 2, label: "test-fail" }),
      /test-fail: HTTP 503/,
    );
    assert.equal(calls, 2);
  });

  it("honours Retry-After header", async () => {
    let calls = 0;
    const t0 = Date.now();
    global.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("wait", {
          status: 429,
          headers: { "retry-after": "0.05" },
        });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", { method: "GET" }, { attempts: 2, label: "retry-after" });
    const elapsed = Date.now() - t0;
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
    assert.ok(elapsed >= 35, `Expected Retry-After wait >= 35ms, got ${elapsed}ms`);
    assert.ok(elapsed < 800, `Expected Retry-After to override 900ms default backoff, got ${elapsed}ms`);
  });

  it("propagates an external abort without retrying", async () => {
    let calls = 0;
    const outer = new AbortController();
    global.fetch = (async (_url, init) => {
      calls += 1;
      outer.abort();
      if (init?.signal?.aborted) {
        throw Object.assign(new Error("Aborted"), { name: "AbortError" });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    await assert.rejects(
      fetchWithRetry("https://example.test/api", { method: "GET" }, { attempts: 3, signal: outer.signal, label: "abort-test" }),
      /Aborted/i,
    );
    assert.equal(calls, 1);
  });

  it("retries HTTP 402 FREE_LIMIT responses using JSON Retry after Ns cooldown", async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({ status: 402, error: { code: "FREE_LIMIT", message: "Free limit reached. Retry after 0.02s" } }),
          { status: 402, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const res = await fetchWithRetry("https://example.test/pollinations", { method: "GET" }, { attempts: 3, label: "poll-402" });
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });
});
