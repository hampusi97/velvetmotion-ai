/** Cloudflare Workers AI image generator — Flux schnell (prompt + steps only). */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (url.pathname !== "/generate") {
      return new Response("VelvetMotion image worker", { headers: cors() });
    }

    const prompt = url.searchParams.get("prompt") || "photorealistic close-up portrait of a beautiful adult woman, 85mm f/1.4, soft window light, Kodak Portra 400, realistic skin pores, natural imperfections, sharp eyes, looking at camera, gentle smile";
    const steps = Math.min(8, Math.max(4, parseInt(url.searchParams.get("steps") || "8", 10) || 8));

    try {
      const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: prompt.slice(0, 1800),
        steps,
      });
      if (!result?.image) {
        return new Response(JSON.stringify({ error: "no image", detail: "empty result" }), {
          status: 502,
          headers: { ...cors(), "Content-Type": "application/json" },
        });
      }
      const binary = Uint8Array.from(atob(result.image), (c) => c.charCodeAt(0));
      return new Response(binary, {
        headers: {
          ...cors(),
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "generation failed", detail: e?.message || String(e) }), {
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
