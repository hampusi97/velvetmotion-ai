import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { freeChat } from "./chatProviders";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("freeChat", () => {
  it("returns trimmed content from choices", async () => {
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "   Sit down and tell me about your week.   " } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )) as typeof fetch;

    const reply = await freeChat([{ role: "user", content: "Hello" }]);
    assert.equal(reply, "Sit down and tell me about your week.");
  });

  it("throws on an empty choices array", async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    await assert.rejects(
      freeChat([{ role: "user", content: "Hello" }]),
      /Empty reply from free chat/,
    );
  });
});
