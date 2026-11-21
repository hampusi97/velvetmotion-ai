import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PAGES_PRODUCTION_URL,
  DEFAULT_WORKERS_PRODUCTION_URL,
  expectedProductionShaMatches,
  probeProductionCommit,
  productionMetaUrl,
  resolveProductionSiteUrl,
  verifyPublicProductionCommit,
} from "./verify-cloudflare-public-commit.mjs";

const sha = "634e2b0a2c8e1f1c560c81f7d444bc16a0b354d9";
const siteUrl = DEFAULT_WORKERS_PRODUCTION_URL;
const pagesSiteUrl = DEFAULT_PAGES_PRODUCTION_URL;

function response(commitSha, opts = {}) {
  const res = new Response(
    opts.body ?? JSON.stringify({ commitSha, version: "1.0.4", builtAt: "2026-11-20T20:00:00Z" }),
    {status: opts.status ?? 200, headers:{"content-type":opts.contentType ?? "application/json"}},
  );
  if (opts.url) Object.defineProperty(res, "url", {value: opts.url});
  return res;
}

test("matches only a full SHA or explicitly documented 7-character build prefix", () => {
  assert.equal(expectedProductionShaMatches(sha,sha),true);
  assert.equal(expectedProductionShaMatches(sha.slice(0,7),sha),true);
  assert.equal(expectedProductionShaMatches(sha.slice(0,6),sha),false);
  assert.equal(expectedProductionShaMatches(sha.slice(0,8),sha),false);
  assert.equal(expectedProductionShaMatches("0000000",sha),false);
});

test("constructs fresh HTTPS origin-only metadata URL and blocks credentialed or insecure URLs", () => {
  const u=productionMetaUrl(siteUrl,sha,2);
  assert.equal(u.origin,siteUrl);
  assert.equal(u.pathname,"/build-meta.json");
  assert.equal(u.searchParams.get("attempt"),"2");
  assert.equal(u.searchParams.get("commit"),sha);
  assert.throws(()=>productionMetaUrl("http://example.test",sha),/HTTPS/);
  assert.throws(()=>productionMetaUrl("https://name:pass@example.test",sha),/HTTPS/);
  assert.throws(()=>productionMetaUrl("https://example.test/some/path",sha),/HTTPS/);
  assert.throws(()=>productionMetaUrl(siteUrl,"short"),/full commit SHA/);
});

test("checks real response content type and cache-busts requests rather than trusting check badges", async () => {
  let sentUrl, opts;
  const result=await probeProductionCommit({
    siteUrl,sha,fetcher:async(url,init)=>{sentUrl=url;opts=init;return response(sha.slice(0,7));},
  });
  assert.equal(result.commitSha,sha.slice(0,7));
  assert.match(sentUrl,/attempt=1/);
  assert.match(sentUrl,/commit=634e2b0a/);
  assert.equal(opts.cache,"no-store");
  assert.equal(opts.redirect,"follow");
});

test("rejects 200 HTML fallback pages and non-JSON responses", async () => {
  await assert.rejects(()=>probeProductionCommit({
    siteUrl,sha,fetcher:async()=>response(null,{contentType:"text/html",body:"<html>Fallback</html>"}),
  }),/unexpected content type/);
  await assert.rejects(()=>probeProductionCommit({
    siteUrl,sha,fetcher:async()=>response(null,{body:"{not valid json}"}),
  }),/not valid JSON/);
});

test("rejects hostile cross-origin redirects and HTTP errors", async () => {
  await assert.rejects(()=>probeProductionCommit({
    siteUrl,sha,fetcher:async()=>response(sha.slice(0,7),{url:"https://attacker.example/build-meta.json"}),
  }),/untrusted origin/);
  await assert.rejects(()=>probeProductionCommit({
    siteUrl,sha,fetcher:async()=>response(sha.slice(0,7),{status:503}),
  }),/HTTP 503/);
});

test("bounded polling tolerates eventual consistency and only returns success for live matching metadata", async () => {
  let calls=0,waits=0;
  const verified=await verifyPublicProductionCommit({
    siteUrl,sha,delayMs:0,attempts:3,log:()=>{},wait:async()=>{waits++;},
    fetcher:async()=>response(++calls===1?"0000000":sha.slice(0,7)),
  });
  assert.equal(verified.attempt,2);
  assert.equal(waits,1);
});

test("fails closed if the production origin never advances from a stale commit", async () => {
  let calls=0;
  await assert.rejects(()=>verifyPublicProductionCommit({
    siteUrl,sha,delayMs:0,attempts:3,log:()=>{},wait:async()=>{},
    fetcher:async()=>{calls++;return response("0000000");},
  }),/was not verified.*serving 0000000/);
  assert.equal(calls,3);
});

test("rejects invalid setup before sending any requests", async () => {
  await assert.rejects(()=>verifyPublicProductionCommit({
    siteUrl:"http://localhost:8787",sha,fetcher:async()=>{throw new Error("Unexpected fetch");},
  }),/HTTPS/);
});

test("defaults Cloudflare Pages production verification to velvetmotion-ai-git.pages.dev", () => {
  assert.equal(pagesSiteUrl, "https://velvetmotion-ai-git.pages.dev");
  assert.deepEqual(resolveProductionSiteUrl({ VERIFIED_PROVIDER: "pages" }), {
    provider: "pages",
    siteUrl: "https://velvetmotion-ai-git.pages.dev",
  });
  const u = productionMetaUrl(pagesSiteUrl, sha, 1);
  assert.equal(u.origin, "https://velvetmotion-ai-git.pages.dev");
  assert.equal(u.pathname, "/build-meta.json");
});
