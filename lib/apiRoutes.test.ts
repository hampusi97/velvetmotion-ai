import { describe, it } from "node:test";

describe("Next.js API Routes", () => {
  it("routes are client-side only on the static Pages deploy", () => {
    // API routes were removed so output: export works on Cloudflare Pages.
    // Chat, image, and video fall back to Pollinations client-side.
  });
});
