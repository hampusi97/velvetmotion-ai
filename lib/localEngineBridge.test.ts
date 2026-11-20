import test from "node:test";
import assert from "node:assert/strict";
import { probeA1111Api } from "./localEngineBridge";

test("recognizes a real Stable Diffusion WebUI models API even with no models installed", async () => {
  let called = "";
  const fetcher = (async (input: RequestInfo | URL, options?: RequestInit) => {
    called = String(input);
    assert.equal(options?.cache, "no-store");
    return Response.json([]);
  }) as typeof fetch;
  assert.equal(await probeA1111Api(fetcher), true);
  assert.equal(called, "http://127.0.0.1:7860/sdapi/v1/sd-models");
});

test("rejects an unrelated service that returns HTTP 404", async () => {
  const fetcher = (async () => new Response("Not Found", {status:404})) as typeof fetch;
  assert.equal(await probeA1111Api(fetcher), false);
});

test("rejects an unrelated server with an unexpected JSON body", async () => {
  const fetcher = (async () => Response.json({ok:true})) as typeof fetch;
  assert.equal(await probeA1111Api(fetcher), false);
});

test("handles a stopped WebUI or browser CORS denial without crashing", async () => {
  const fetcher = (async () => { throw new Error("Connection refused"); }) as typeof fetch;
  assert.equal(await probeA1111Api(fetcher), false);
});
