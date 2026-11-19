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
import { buildSamplerPayload, DAVIDAU_RECOMMENDED_GGUFS, DAVIDAU_RESOURCES, ANTI_SLOP_BAN_PHRASES, buildContinueSteeringMessages } from "./samplerPresets";
import { generateHordeImage } from "./aiHorde";
import { fetchWorkerImage, imageWorkerBase } from "./imageWorker";

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

  it("builds DavidAU Class 1-4 sampler payloads for KoboldCpp, Ollama, and OpenRouter", () => {
    const k = buildSamplerPayload("koboldcpp", "creative-dry-class3");
    assert.equal(k.min_p, 0.05);
    assert.equal(k.repeat_last_n, 64);
    assert.equal(k.dry_multiplier, 0.8);
    assert.equal(k.max_tokens, 280);

    const kUltra = buildSamplerPayload("koboldcpp", "ultra-prose-class4");
    assert.equal(kUltra.dynatemp_range, 0.5);
    assert.equal(kUltra.max_tokens, 300);

    const o = buildSamplerPayload("ollama", "roleplay-balanced") as {
      max_tokens: number;
      options: { min_p: number; repeat_last_n: number; num_predict: number };
    };
    assert.equal(o.max_tokens, 260);
    assert.equal(o.options.min_p, 0.05);
    assert.equal(o.options.repeat_last_n, 64);
    assert.equal(o.options.num_predict, 260);

    const kNoSlop = buildSamplerPayload("koboldcpp", "creative-dry-class3", false);
    assert.equal(kNoSlop.banned_tokens, undefined);
    assert.deepEqual(k.banned_tokens, ANTI_SLOP_BAN_PHRASES);

    const or = buildSamplerPayload("openrouter", "creative-dry-class3");
    assert.equal(or.max_tokens, 280);
    assert.equal(or.dry_multiplier, undefined);
    assert.ok(DAVIDAU_RECOMMENDED_GGUFS.every((g) => g.url.startsWith("https://huggingface.co/")));
    assert.ok(DAVIDAU_RESOURCES.antiSlopRepo.startsWith("https://"));

    const steered = buildContinueSteeringMessages("Be natural.", [
      { role: "user", content: "Hey" },
      { role: "assistant", content: "Chloe leans on the rail, smiling." },
    ]);
    assert.equal(steered[0].role, "system");
    assert.ok(steered[0].content.includes("STEERING INSTRUCTION"));
    assert.equal(steered[steered.length - 1].role, "user");
  });

  it("caps AI Horde free requests at 512x768, 20 steps, n=1 and normalizes worker /generate URL", async () => {
    assert.equal(imageWorkerBase("https://velvetmotion-image.hampusi97.workers.dev/generate/"), "https://velvetmotion-image.hampusi97.workers.dev");

    const origFetch = globalThis.fetch;
    const seenUrls: string[] = [];
    let hordeBody: Record<string, unknown> | null = null;
    try {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        seenUrls.push(url);
        if (url.includes("/generate/async")) {
          hordeBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
          return new Response(JSON.stringify({ id: "job-1" }), { status: 202 });
        }
        if (url.includes("/generate/check/")) {
          return new Response(JSON.stringify({ done: true }), { status: 200 });
        }
        if (url.includes("/generate/status/")) {
          return new Response(JSON.stringify({ generations: [{ img: "https://cdn.example.com/out.webp", censored: false }] }), { status: 200 });
        }
        return new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }) as typeof fetch;

      const workerRes = await fetchWorkerImage("neon balcony lace portrait", { steps: 8, seed: 777 });
      assert.equal(workerRes.ok, true);
      assert.ok(seenUrls[0].includes("/generate?"));
      assert.ok(seenUrls[0].includes("steps=8"));
      assert.ok(seenUrls[0].includes("seed=777"));

      const hordeRes = await generateHordeImage({ prompt: "test", width: 1024, height: 1536, steps: 40, apiKey: "custom-key" });
      assert.equal(hordeRes.url, "https://cdn.example.com/out.webp");
      const params = (hordeBody as unknown as { params: Record<string, unknown> }).params;
      assert.equal(params.width, 512);
      assert.equal(params.height, 768);
      assert.equal(params.steps, 20);
      assert.equal(params.n, 1);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
