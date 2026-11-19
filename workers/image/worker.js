/** Cloudflare Workers AI image generator — free tier ~173 FLUX images/day. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (url.pathname !== "/generate") {
      return new Response("VelvetMotion image worker", { headers: cors() });
    }
    const prompt = url.searchParams.get("prompt") || "photoreal portrait of an adult woman";
    const seed = parseInt(url.searchParams.get("seed") || "0", 10) || Math.floor(Math.random() * 100000);
    try {
      const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: prompt.slice(0, 1800),
        steps: 4,
        seed,
      });
      if (!result?.image) throw new Error("no image");
      const binary = Uint8Array.from(atob(result.image), (c) => c.charCodeAt(0));
      return new Response(binary, {
        headers: { ...cors(), "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 502,
        headers: { ...cors(), "Content-Type": "application/json" },
      });
    }
  },
};
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
