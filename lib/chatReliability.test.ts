import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHAT_REQUEST_TIMEOUT_MS,
  ensureVisibleReply,
  generateCompanionReply,
  type ChatRouterRuntime,
  type CompanionPersona,
  type RouterMessage,
} from "./chatRouter";
import { detectExplicitMediaIntent, sanitizeCompanionReply, splitIntoNaturalBubbles } from "./dynamicChatEngine";
import { installPromptOverlapsComposer } from "../components/InstallPrompt";
import { createChatTurnGuard, createTranscriptRevision, shouldCommitTurnToActiveView } from "./chatTurn";

const persona: CompanionPersona = {
  id: "aria-vale",
  name: "Aria Vale",
  age: 27,
  tagline: "Night owl with a soft laugh",
  personality: "Dry, nocturnal, and specific",
  backstory: "A fictional adult who keeps a jazz bar open after midnight.",
  traits: ["Nocturnal", "Exact"],
  kink: "Slow confession",
  voiceStyle: "Low and unhurried",
  voiceLine: "Aria keeps her voice low, like the bar after last call. “Stay. Tell me the part you almost didn't.”",
};

const history: RouterMessage[] = [{ role: "user", text: "How was your day?" }];

function customSettings(provider: "custom" | "auto" | "ai-horde" = "custom"): ChatRouterRuntime["settings"] {
  return {
    provider,
    customBaseUrl: "https://primary.example.test/v1",
    customApiKey: "test-key",
    customModel: "test-model",
    openRouterApiKey: provider === "auto" ? "test-or-key" : undefined,
    aiHordeApiKey: "test-horde-key",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function replyWith(
  fetchImpl: typeof fetch,
  settings = customSettings(),
  timeoutMs = 80,
) {
  const guard = createChatTurnGuard(persona.id);
  const generation = guard.tryStart();
  assert.ok(generation);
  assert.equal(guard.snapshot().thinking, true);
  assert.equal(guard.tryStart(), null, "a second submit while thinking is ignored");

  let text = "";
  let providerUsed = "";
  let outcome: "success" | "error" | "timeout" | "abort" = "success";
  try {
    const result = await generateCompanionReply(history, persona, {
      settings,
      fetchImpl,
      timeoutMs,
    });
    text = ensureVisibleReply(result.text, history, persona);
    providerUsed = result.providerUsed;
    if (!text.trim()) outcome = "error";
  } catch (err) {
    outcome = err instanceof Error && err.name === "AbortError" ? "timeout" : "error";
    text = ensureVisibleReply("", history, persona);
  } finally {
    guard.clearThinking(generation);
    const settled = guard.settle(generation, outcome);
    assert.equal(settled, true);
  }

  assert.equal(guard.snapshot().thinking, false);
  assert.equal(guard.snapshot().locked, false);
  assert.ok(text.trim().length > 1, "a visible text reply is required");
  assert.equal(guard.snapshot().lastOutcome, outcome);
  return { text, providerUsed, outcome };
}

describe("companion chat reliability", () => {
  it("uses a bounded request timeout", () => {
    assert.equal(CHAT_REQUEST_TIMEOUT_MS, 12_000);
    assert.ok(CHAT_REQUEST_TIMEOUT_MS <= 20_000);
  });

  it("still replies when the primary endpoint is unreachable, and clears thinking", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    const result = await replyWith(fetchImpl);
    assert.equal(calls, 2, "unreachable endpoints are retried once");
    assert.equal(result.providerUsed, "in-character-fallback");
    assert.match(result.text, /Aria/);
    assert.doesNotMatch(result.text, /isn't responding/i);
  });

  it("still replies when the primary endpoint returns non-2xx", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return jsonResponse({ error: "unavailable" }, 502);
    }) as typeof fetch;
    const result = await replyWith(fetchImpl);
    assert.equal(calls, 2);
    assert.equal(result.providerUsed, "in-character-fallback");
    assert.ok(result.text.trim().length > 1);
  });

  it("still replies when the primary endpoint returns malformed JSON", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return jsonResponse("<<<not-json", 200);
    }) as typeof fetch;
    const result = await replyWith(fetchImpl);
    assert.equal(calls, 2);
    assert.equal(result.providerUsed, "in-character-fallback");
    assert.ok(result.text.includes("Aria"));
  });

  it("still replies when the completion is empty", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return jsonResponse({ choices: [{ message: { content: "   " } }] });
    }) as typeof fetch;
    const result = await replyWith(fetchImpl);
    assert.equal(calls, 2);
    assert.equal(result.providerUsed, "in-character-fallback");
    assert.ok(result.text.trim().length > 1);
  });

  it("times out a slow endpoint without a second wait, then replies and clears thinking", async () => {
    let calls = 0;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      calls += 1;
      await new Promise((_resolve, reject) => {
        const abort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        if (init?.signal?.aborted) {
          abort();
          return;
        }
        init?.signal?.addEventListener("abort", abort, { once: true });
      });
      return jsonResponse({});
    }) as typeof fetch;

    const started = Date.now();
    const result = await replyWith(fetchImpl, customSettings(), 60);
    const elapsed = Date.now() - started;
    assert.equal(calls, 1, "timeouts fall through instead of retrying the slow call");
    assert.ok(elapsed < 1_000, `timeout should not stall the turn (${elapsed}ms)`);
    assert.equal(result.providerUsed, "in-character-fallback");
    assert.equal(result.outcome, "success");
    assert.ok(result.text.trim().length > 1);
  });

  it("uses a secondary provider when the primary endpoint fails", async () => {
    const seen: string[] = [];
    const hostOf = (url: string) => {
      try {
        return new URL(url).hostname;
      } catch {
        return "";
      }
    };
    const fetchImpl = (async (url: string) => {
      const target = String(url);
      seen.push(target);
      const host = hostOf(target);
      if (host === "primary.example.test") return jsonResponse({ error: "down" }, 503);
      if (host === "openrouter.ai") {
        return jsonResponse({ choices: [{ message: { content: "I kept the lights low and waited for you." } }] });
      }
      return jsonResponse({ error: "horde should not run" }, 500);
    }) as typeof fetch;

    const result = await replyWith(fetchImpl, customSettings("auto"));
    assert.equal(seen.filter((url) => hostOf(url) === "primary.example.test").length, 2);
    assert.ok(seen.some((url) => hostOf(url) === "openrouter.ai"));
    assert.equal(seen.some((url) => hostOf(url) === "aihorde.net"), false);
    assert.equal(result.providerUsed, "openrouter-byok");
    assert.match(result.text, /lights low/);
  });

  it("falls back when AI Horde is non-2xx or returns malformed JSON", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) return jsonResponse("nope", 200);
      return jsonResponse({ error: "nope" }, 500);
    }) as typeof fetch;
    const result = await replyWith(fetchImpl, customSettings("ai-horde"), 2000);
    assert.ok(calls >= 2);
    assert.equal(result.providerUsed, "in-character-fallback");
    assert.ok(result.text.trim().length > 1);
  });

  it("does not treat ordinary wording as an image or video request", () => {
    for (const ordinary of [
      "Pick the movie—I'll bring snacks",
      "I pick Dare—don't hold back",
      "That was an epic spicy story",
      "Picture this: we get dinner first",
      "I saw you across the room",
      "How was your day?",
    ]) {
      assert.equal(detectExplicitMediaIntent(ordinary), null, ordinary);
    }
    assert.equal(detectExplicitMediaIntent("send me a pic")?.kind, "image");
    assert.equal(detectExplicitMediaIntent("Send me a cozy couch selfie first")?.kind, "image");
    assert.equal(detectExplicitMediaIntent("show me a photo of you")?.kind, "image");
    assert.equal(detectExplicitMediaIntent("make a short video")?.kind, "video");
    assert.equal(detectExplicitMediaIntent("Do not send me a photo"), null);
    assert.equal(detectExplicitMediaIntent("Please do not make a video"), null);
    assert.deepEqual(splitIntoNaturalBubbles("   "), []);
  });

  it("keeps fallback replies in the selected character's voice", async () => {
    const fetchImpl = (async () => jsonResponse({ error: "down" }, 503)) as typeof fetch;
    const maren: CompanionPersona = {
      id: "maren",
      name: "Maren Voss",
      age: 34,
      tagline: "Supper-club host",
      personality: "Commanding and precise",
      traits: ["Commanding", "Exact"],
      kink: "Formal dominance and service protocol",
      voiceStyle: "Low, unhurried, and exact",
      voiceLine: "Maren does not raise her voice. “Hands where I can see them. Try again, properly.”",
    };
    const liora: CompanionPersona = {
      id: "liora",
      name: "Liora Fenwick",
      age: 26,
      tagline: "Botanical illustrator",
      personality: "Earnest, easily flustered, brave in private",
      traits: ["Gentle", "Earnest"],
      kink: "Praise and being gently led",
      voiceStyle: "Quiet and a little breathy",
      voiceLine: "Liora twists her sleeve. “I like when you go slow. Tell me I'm doing this right.”",
    };
    const marenReply = await replyWith(fetchImpl, customSettings(), 80);
    const lioraReply = await generateCompanionReply([{ role: "user", text: "How was your day?" }], liora, {
      settings: customSettings(),
      fetchImpl,
      timeoutMs: 80,
    });
    const marenDirect = await generateCompanionReply([{ role: "user", text: "How was your day?" }], maren, {
      settings: customSettings(),
      fetchImpl,
      timeoutMs: 80,
    });
    assert.equal(marenDirect.providerUsed, "in-character-fallback");
    assert.match(marenDirect.text, /Hands where I can see them/);
    assert.match(lioraReply.text, /Tell me I'm doing this right/);
    assert.notEqual(marenDirect.text, lioraReply.text);
    assert.doesNotMatch(marenDirect.text, /Blade Runner|synthwave|full attention/i);
    assert.doesNotMatch(lioraReply.text, /Blade Runner|synthwave|full attention/i);
    assert.match(marenReply.text, /almost didn't/);
  });

  it("sends this character's persona and the conversation, and rejects a generic assistant completion", async () => {
    let body: { messages?: Array<{ role: string; content: string }>; max_tokens?: number } | null = null;
    const thread: RouterMessage[] = [
      { role: "user", text: "Remember that I take my coffee black." },
      { role: "assistant", text: "Black coffee. I heard you." },
      { role: "user", text: "How was your day?" },
    ];
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body || "{}"));
      return jsonResponse({
        choices: [{ message: { content: "How can I help you today? I am an assistant." } }],
      });
    }) as typeof fetch;
    const result = await generateCompanionReply(thread, persona, {
      settings: customSettings(),
      fetchImpl,
      timeoutMs: 80,
    });
    assert.ok(body);
    const sent = body as { messages: Array<{ role: string; content: string }>; max_tokens?: number };
    assert.equal(sent.messages[0]?.role, "system");
    assert.match(sent.messages[0].content, /Aria Vale/);
    assert.match(sent.messages[0].content, /Slow confession/);
    assert.match(sent.messages[0].content, /almost didn't/);
    assert.match(sent.messages[0].content, /Low and unhurried/);
    assert.equal(sent.messages.at(-1)?.content, "How was your day?");
    assert.ok(sent.messages.some((m) => m.content.includes("coffee black")));
    assert.ok((sent.max_tokens || 0) >= 200);
    assert.equal(result.providerUsed, "in-character-fallback");
    assert.doesNotMatch(result.text, /how can i help you today/i);
    assert.match(result.text, /almost didn't/);
  });

  it("drops a late reply when the user switched characters, and clears thinking on abort", () => {
    const guard = createChatTurnGuard("aria-vale");
    const first = guard.tryStart();
    assert.equal(guard.snapshot().thinking, true);
    guard.switchConversation("blair-cole");
    assert.equal(guard.snapshot().thinking, false);
    assert.equal(guard.snapshot().locked, false);
    assert.equal(guard.snapshot().lastOutcome, "abort");
    assert.equal(
      shouldCommitTurnToActiveView({
        activeConversationId: guard.snapshot().conversationId,
        originConversationId: "aria-vale",
        generation: first || 0,
        currentGeneration: guard.snapshot().generation,
      }),
      false,
    );

    const second = guard.tryStart();
    assert.ok(second);
    assert.equal(guard.settle(first || 0, "success"), false, "the old turn cannot unlock the new one");
    assert.equal(guard.snapshot().thinking, true);
    assert.equal(guard.snapshot().locked, true);
    assert.equal(guard.settle(second || 0, "abort"), true);
    const revisions = createTranscriptRevision();
    const firstWrite = revisions.start("aria-vale");
    const newerWrite = revisions.start("aria-vale");
    assert.equal(revisions.owns("aria-vale", firstWrite), false);
    assert.equal(revisions.owns("aria-vale", newerWrite), true);
    assert.equal(revisions.owns("blair-cole", firstWrite), false);
    assert.equal(guard.snapshot().thinking, false);
    assert.equal(guard.snapshot().locked, false);
  });

  it("drops leaked reasoning, including the plain-prose second bubble from the live chat", () => {
    const spoken = "*leans in, voice low* I like the kind that makes people forget their names. Rain? Too wet. Snow? Too cold. But a scorch like this that glances at the sun? It turns everyone into an open book. What about you? Prefer your weather with a side of surprises?";
    const planning = "Okay, the user asked about my favorite weather. I need to keep it playful and flirty, matching the golden hour vibe. Let me think... I should avoid generic answers. Maybe something that hints at my performative side. Rain is too wet, snow too cold—I go with the heat. It makes people more open, which ties into my personality. Then I'll flip it back to them with a question that keeps the conversation going.";
    const leaked = `${spoken}\n\n${planning}`;
    const cleaned = sanitizeCompanionReply(leaked, "Nova Reyes");
    assert.match(cleaned, /Rain\? Too wet/);
    assert.doesNotMatch(cleaned, /the user asked|Let me think|avoid generic|flip it back/i);
    const bubbles = splitIntoNaturalBubbles(cleaned);
    assert.ok(bubbles.length >= 1);
    assert.equal(bubbles.some((bubble) => /the user asked/i.test(bubble)), false);

    assert.match(sanitizeCompanionReply(`<think>${planning}</think>\n\n${spoken}`, "Nova Reyes"), /Rain\?/);
    assert.doesNotMatch(sanitizeCompanionReply(`${spoken}\n<think>\n${planning}`, "Nova Reyes"), /the user asked/i);
    assert.equal(sanitizeCompanionReply(`<think>${planning}`, "Nova Reyes"), "");
    assert.equal(sanitizeCompanionReply(planning, "Nova Reyes"), "");
    assert.match(sanitizeCompanionReply("I need to see you closer tonight.", "Nova"), /closer tonight/);
  });

  it("ignores reasoning fields and treats a reasoning-only completion as empty", async () => {
    const planning = "Okay, the user asked about my favorite weather. I need to keep it playful and flirty. Let me think... I should avoid generic answers.";
    const spoken = "Heat. The kind that makes you honest with me.";
    let sawThinkDisabled = false;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as { reasoning?: { exclude?: boolean } };
      if (body.reasoning?.exclude) sawThinkDisabled = true;
      return jsonResponse({
        choices: [{
          message: {
            content: [
              { type: "reasoning", text: planning },
              { type: "text", text: spoken },
            ],
            reasoning_content: planning,
          },
        }],
      });
    }) as typeof fetch;
    const result = await generateCompanionReply(history, { ...persona, name: "Nova Reyes" }, {
      settings: {
        provider: "openrouter",
        openRouterApiKey: "test-or-key",
        customModel: "deepseek/deepseek-chat",
      },
      fetchImpl,
      timeoutMs: 80,
    });
    assert.equal(sawThinkDisabled, true);
    assert.equal(result.providerUsed, "openrouter-byok");
    assert.match(result.text, /makes you honest/);
    assert.doesNotMatch(result.text, /the user asked/i);

    const onlyPlanning = await generateCompanionReply(history, persona, {
      settings: customSettings(),
      fetchImpl: (async () => jsonResponse({ choices: [{ message: { content: planning, reasoning_content: planning } }] })) as typeof fetch,
      timeoutMs: 80,
    });
    assert.equal(onlyPlanning.providerUsed, "in-character-fallback");
    assert.doesNotMatch(onlyPlanning.text, /the user asked|Let me think/i);
  });

  it("keeps the install prompt off chat composers", () => {
    assert.equal(installPromptOverlapsComposer("chat"), true);
    assert.equal(installPromptOverlapsComposer("group"), true);
    assert.equal(installPromptOverlapsComposer("dual"), true);
    assert.equal(installPromptOverlapsComposer("home"), false);
  });
});
