import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePollinationsImage } from "./imageProviders";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

const validJpegBytes = new Uint8Array(2500).fill(0x55);
validJpegBytes[0] = 0xff;
validJpegBytes[1] = 0xd8;
validJpegBytes[2] = 0xff;

describe("imageProviders", () => {
  it("retries a 429 then returns a data:image/jpeg URL", async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("too many requests", {
          status: 429,
          headers: { "retry-after": "0.01" },
        });
      }
      return new Response(validJpegBytes, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }) as typeof fetch;

    const url = await generatePollinationsImage({
      prompt: "editorial portrait",
      seed: 10,
      width: 512,
      height: 768,
      nsfw: false,
    });
    assert.equal(calls, 2);
    assert.match(url, /^data:image\/jpeg;base64,/);
  });

  it("rejects a non-image body with /non-image/", async () => {
    global.fetch = (async () => {
      return new Response("<html>error</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }) as typeof fetch;

    await assert.rejects(
      generatePollinationsImage({
        prompt: "editorial portrait",
        seed: 10,
        width: 512,
        height: 768,
        nsfw: false,
      }),
      /non-image/,
    );
  });

  it("trims a 4000-char prompt so the generated URL stays under 3000 chars", async () => {
    let seenUrl = "";
    global.fetch = (async (input) => {
      seenUrl = String(input);
      return new Response(validJpegBytes, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }) as typeof fetch;

    await generatePollinationsImage({
      prompt: "a".repeat(4000),
      seed: 42,
      width: 512,
      height: 768,
      nsfw: true,
    });
    assert.ok(seenUrl.length > 0 && seenUrl.length < 3000, `Expected URL < 3000 chars, got ${seenUrl.length}`);
  });
});
