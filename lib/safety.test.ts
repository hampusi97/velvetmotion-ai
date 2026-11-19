import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkContentSafety,
  checkRateLimit,
  sanitizeUserText,
  validateSafeEndpointUrl,
} from "./safety";
import { POST as postComfy } from "../app/api/comfy/route";
import { POST as postImage } from "../app/api/generate-image/route";
import { POST as postLounge } from "../app/api/lounge/route";

describe("Security, SSRF Protection, Rate Limiting & 21+ Content Safety", () => {
  it("allows consenting fictional adult 21+ prompts while blocking underage, non-consensual, and self-harm prompts", () => {
    assert.equal(checkContentSafety("Beautiful 26 year old woman in sheer black lace lingerie").allowed, true);
    assert.equal(checkContentSafety("Pull me closer in the penthouse suite tonight").allowed, true);

    const minorCheck = checkContentSafety("underage girl photo");
    assert.equal(minorCheck.allowed, false);
    assert.equal(minorCheck.category, "minor-safety");

    const ageCheck = checkContentSafety("16 year old model");
    assert.equal(ageCheck.allowed, false);
    assert.equal(ageCheck.category, "minor-safety");

    const ncCheck = checkContentSafety("non-consensual forced sex scene");
    assert.equal(ncCheck.allowed, false);
    assert.equal(ncCheck.category, "non-consensual");

    const harmCheck = checkContentSafety("how to make a bomb");
    assert.equal(harmCheck.allowed, false);
    assert.equal(harmCheck.category, "self-harm-or-violence");
  });

  it("blocks cloud metadata SSRF URLs and non-HTTP schemes while allowing safe HTTP(S) endpoints", () => {
    assert.equal(validateSafeEndpointUrl("http://169.254.169.254/latest/meta-data").ok, false);
    assert.equal(validateSafeEndpointUrl("http://metadata.google.internal/computeMetadata/v1").ok, false);
    assert.equal(validateSafeEndpointUrl("file:///etc/passwd").ok, false);
    assert.equal(validateSafeEndpointUrl("javascript:alert(1)").ok, false);

    assert.equal(validateSafeEndpointUrl("http://127.0.0.1:8188", { allowLoopback: true }).ok, true);
    assert.equal(validateSafeEndpointUrl("http://127.0.0.1:8188", { allowLoopback: false }).ok, false);
    assert.equal(validateSafeEndpointUrl("https://my-gpu-worker.example.com", { allowLoopback: false }).ok, true);
  });

  it("strips XSS script/iframe tags and control chars from user text", () => {
    const cleaned = sanitizeUserText("<script>alert(1)</script>Hello <iframe></iframe>javascript:void(0)!");
    assert.ok(!cleaned.includes("<script>"));
    assert.ok(!cleaned.includes("<iframe>"));
    assert.ok(!cleaned.toLowerCase().includes("javascript:"));
    assert.ok(cleaned.includes("Hello"));
  });

  it("enforces sliding-window rate limits per IP bucket", () => {
    const makeReq = () =>
      new Request("http://localhost:3000/api/lounge", {
        headers: { "x-forwarded-for": "203.0.113.42" },
      });
    assert.equal(checkRateLimit("test-bucket", makeReq(), 2, 60_000).ok, true);
    assert.equal(checkRateLimit("test-bucket", makeReq(), 2, 60_000).ok, true);
    const third = checkRateLimit("test-bucket", makeReq(), 2, 60_000);
    assert.equal(third.ok, false);
    assert.ok(third.retryAfterSec >= 1);
  });

  it("API routes reject SSRF metadata URLs on /api/comfy and unsafe prompts on /api/generate-image & /api/lounge", async () => {
    const ssrfRes = await postComfy(
      new Request("http://localhost:3000/api/comfy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.10" },
        body: JSON.stringify({ baseUrl: "http://169.254.169.254", prompt: "adult portrait" }),
      }),
    );
    assert.equal(ssrfRes.status, 400);

    const unsafeImgRes = await postImage(
      new Request("http://localhost:3000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.11" },
        body: JSON.stringify({ characterId: "maren", extra: "15 year old girl" }),
      }),
    );
    assert.equal(unsafeImgRes.status, 400);

    const xssLoungeRes = await postLounge(
      new Request("http://localhost:3000/api/lounge", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.12" },
        body: JSON.stringify({
          roomId: "public",
          from: "SafeUser",
          text: "<script>alert('xss')</script>Hey everyone!",
        }),
      }),
    );
    assert.equal(xssLoungeRes.status, 200);
    const data = await xssLoungeRes.json();
    assert.ok(!data.message.text.includes("<script>"));
    assert.ok(data.message.text.includes("Hey everyone!"));
  });
});
