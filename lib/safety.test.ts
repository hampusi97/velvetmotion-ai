import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkContentSafety,
  checkRateLimit,
  sanitizeUserText,
  validateSafeEndpointUrl,
} from "./safety";
import { assertCompliance } from "./complianceFilter";
import { sanitizeCompanionReply } from "./chatRouter";

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

  it("enforces NCII/minor complianceFilter & strips <think> blocks in chatRouter", () => {
    assert.equal(assertCompliance("24-year-old fictional adult in neon loft").ok, true);
    assert.equal(assertCompliance("deepfake celebrity nude without consent").ok, false);
    assert.equal(assertCompliance("barely legal teen photo").ok, false);

    assert.equal(
      sanitizeCompanionReply("<think>internal notes</think>\nChloe: Hey! I love Blade Runner.", "Chloe"),
      "Hey! I love Blade Runner.",
    );
    assert.equal(
      sanitizeCompanionReply("<think>truncated unfinished block", "Mia"),
      "",
    );
    assert.equal(
      sanitizeCompanionReply("I think I'll just... be a robot.", "Nova"),
      "",
    );
  });
});
