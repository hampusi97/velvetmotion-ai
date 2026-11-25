import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDynamicSystemPrompt,
  detectExplicitMediaIntent,
  sanitizeCompanionReply,
} from "./dynamicChatEngine";
import { buildContextualMediaSpec, extractCleanVisualSubject } from "./sceneRequest";

describe("Contextual chat media intent & relevant scene extraction", () => {
  it("detects natural hyphenated, apostrophe, and outfit photo/video requests without false positives", () => {
    assert.equal(detectExplicitMediaIntent("send me a full-body picture in a red dress")?.kind, "image");
    assert.equal(detectExplicitMediaIntent("show me what you're wearing")?.kind, "image");
    assert.equal(detectExplicitMediaIntent("can I get a pic of you on the beach?")?.kind, "image");
    assert.equal(detectExplicitMediaIntent("drop a mirror selfie in lace lingerie")?.kind, "image");
    assert.equal(detectExplicitMediaIntent("send me a video of you dancing in the neon rain")?.kind, "video");

    // Must remain null on ordinary conversation
    assert.equal(detectExplicitMediaIntent("Pick a song for tonight"), null);
    assert.equal(detectExplicitMediaIntent("Picture this: we travel to Tokyo"), null);
    assert.equal(detectExplicitMediaIntent("Don't send me any photos right now"), null);
  });

  it("strips conversational wrappers down to the pure visual scene", () => {
    const cleaned = extractCleanVisualSubject(
      "Hey babe, can you please send me a picture of you wearing a red velvet cocktail dress on a rooftop balcony?",
    );
    assert.ok(!/send me a picture/i.test(cleaned), cleaned);
    assert.match(cleaned, /wearing a red velvet cocktail dress on a rooftop balcony/i);

    const mirror = extractCleanVisualSubject("send me a mirror selfie in a black bikini");
    assert.match(mirror, /mirror/i);
    assert.match(mirror, /black bikini/i);
  });

  it("maps mood and motion preset accurately for explicit, lingerie, and outdoor requests", () => {
    const beach = buildContextualMediaSpec({
      userText: "send me a bikini pic on the beach at sunset",
    });
    assert.equal(beach.mood, "lingerie");
    assert.equal(beach.motionId, "balcony-breeze");
    assert.match(beach.visualPrompt, /bikini.*beach at sunset/i);

    const bedroomNude = buildContextualMediaSpec({
      userText: "show me a nude photo on silk sheets",
    });
    assert.equal(bedroomNude.mood, "nude");
    assert.match(bedroomNude.visualPrompt, /nude|silk sheets/i);
  });

  it("pulls visual outfit and setting from the active conversation when user just says 'send me a pic'", () => {
    const contextual = buildContextualMediaSpec({
      userText: "send me a pic right now",
      assistantReply: "*Leans against the grand piano in my midnight silk gown under warm candlelight.* Here, just for you.",
      recentMessages: [
        { role: "assistant", content: "The jazz lounge is empty now." },
      ],
    });
    assert.equal(contextual.mood, "scene");
    assert.equal(contextual.motionId, "neon-hair-sway");
    assert.match(contextual.visualPrompt, /grand piano.*midnight silk gown/i);
  });

  it("filters false text-LLM image-sharing refusals (including curly apostrophes) and instructs companions to play along", () => {
    assert.equal(
      sanitizeCompanionReply("I’m afraid I can’t share that. If you’d like, I can describe the scene instead.", "Seraphina"),
      "",
    );
    assert.equal(
      sanitizeCompanionReply("Sorry, I cannot send images directly, but imagine me on the terrace.", "Seraphina"),
      "",
    );
    assert.equal(
      sanitizeCompanionReply("*Adjusts my crimson silk gown under the stars.* Just snapped this for you—don't stare too long.", "Seraphina"),
      "*Adjusts my crimson silk gown under the stars.* Just snapped this for you—don't stare too long.",
    );

    const sys = buildDynamicSystemPrompt({
      companion: { id: "seraphina", name: "Seraphina", age: 25, personality: "Witty", backstory: "Astrophysicist" },
      memories: [],
      relationshipLevel: 4,
    });
    assert.ok(sys.includes("Do NOT write [Image of ...] or [Photo of ...]"));
    assert.ok(sys.includes("VelvetMotion automatically captures and attaches your real photo or video clip"));
  });
});
