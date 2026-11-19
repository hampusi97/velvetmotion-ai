/** Cloudflare Workers AI image generator — tries better model, falls back to schnell. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (url.pathname !== "/generate") {
      return new Response("VelvetMotion image worker", { headers: cors() });
    }
    const prompt = url.searchParams.get("prompt") || "photoreal portrait of an adult woman, soft window light, realistic skin";
    const seed = parseInt(url.searchParams.get("seed") || "0", 10) || Math.floor(Math.random() * 100000);
    
    const models = ["@cf/black-forest-labs/flux-2-klein-9b", "@cf/black-forest-labs/flux-1-schnell"];
    
    for (const model of models) {
      try {
        const result = await env.AI.run(model, {
          prompt: prompt.slice(0, 1800),
          steps: model.includes("klein") ? 8 : 4,
          seed,
        });
        if (!result?.image) continue;
        const binary = Uint8Array.from(atob(result.image), (c) => c.charCodeAt(0));
        return new Response(binary, {
          headers: { ...cors(), "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
        });
      } catch (e) {
        continue;
      }
    }
    
    return new Response(JSON.stringify({ error: "all models failed" }), {
      status: 502,
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  },
};
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
