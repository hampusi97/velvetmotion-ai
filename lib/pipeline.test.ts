import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeCompanionPipeline } from "./pipeline";
import { resolveBestMediaUrl } from "./media";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("companion & media pipelines", () => {
  it("executeCompanionPipeline runs all 4 stages including scene selfie, 4-frame sequence, and aftercare", () => {
    const out = executeCompanionPipeline({
      characterId: "camille-laurent",
      userMessage: "My name is Alex. Send me a mirror selfie tonight.",
      intimacy: 44,
      romanceMode: true,
      sceneId: "penthouse",
      includeSelfie: true,
      sequenceKind: "joi",
      includeAftercare: true,
    });

    assert.equal(out.ok, true);
    assert.equal(out.character.id, "camille-laurent");
    assert.deepEqual(out.stages, [
      "memory-and-mood",
      "dialogue-and-monologue",
      "scene-selfie",
      "motion-sequence",
      "relationship-progression",
    ]);
    assert.ok(out.systemPrompt.includes("Camille"));
    assert.ok(out.reply.length > 10);
    assert.ok(out.innerThought.length > 10);
    assert.ok(out.sceneSelfie?.url.startsWith("/portraits/"));
    assert.equal(out.sequence?.frames.length, 4);
    assert.ok(typeof out.aftercare === "string" && out.aftercare.length > 5);
    assert.equal(out.relationship.intimacy, 47);
  });

  it("resolveBestMediaUrl routes adult selfie requests through Pollinations ahead of AI Horde with locked identity", async () => {
    const origWin = (globalThis as { window?: unknown }).window;
    const seenUrls: string[] = [];
    const validJpeg = new Uint8Array(2500).fill(0x44);
    validJpeg[0] = 0xff;
    validJpeg[1] = 0xd8;
    validJpeg[2] = 0xff;

    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {},
      },
    };

    global.fetch = (async (input) => {
      const url = String(input);
      seenUrls.push(url);
      if (url.includes("image.pollinations.ai/prompt/")) {
        return new Response(validJpeg, {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        });
      }
      return new Response("offline", { status: 503 });
    }) as typeof fetch;

    try {
      const res = await resolveBestMediaUrl(
        {
          id: "camille-laurent",
          name: "Camille",
          age: 29,
          figure: "French woman 29",
          visualDna: "29-year-old French woman with dark blunt-cut hair",
        },
        "lingerie",
        "silk slip at dusk",
      );

      assert.equal(res.engine, "pollinations-flux");
      assert.match(res.url, /^data:image\/jpeg;base64,/);
      const pollinationsCall = seenUrls.find((u) => u.includes("image.pollinations.ai/prompt/")) || "";
      assert.ok(
        decodeURIComponent(pollinationsCall).includes("unique face seed camille-l-v2"),
        "Expected locked identity fragment prepended to Pollinations prompt",
      );
      assert.equal(
        seenUrls.some((u) => u.includes("aihorde.net")),
        false,
        "Expected Pollinations to succeed before reaching AI Horde",
      );
    } finally {
      if (origWin === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = origWin;
      }
    }
  });
});
