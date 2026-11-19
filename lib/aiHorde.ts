/**
 * AI Horde (aihorde.net) free image generation.
 * Anonymous key works. NSFW flag routes to opt-in workers.
 */

const HORDE_BASE = "https://aihorde.net/api/v2";
const ANON_KEY = "0000000000";

export type HordeGenOptions = {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  nsfw?: boolean;
  models?: string[];
  seed?: number;
};

export async function generateHordeImage(opts: HordeGenOptions): Promise<{ url: string; note: string }> {
  const {
    prompt,
    width = 768,
    height = 1152,
    steps = 25,
    nsfw = true,
    models = ["Pony Diffusion XL", "WAI-ANI-NSFW-PONYXL", "DreamShaper XL", "Juggernaut XL"],
    seed,
  } = opts;

  const body = {
    prompt: prompt.slice(0, 1000),
    models,
    params: {
      width,
      height,
      steps,
      cfg_scale: 7,
      sampler_name: "k_euler_a",
      n: 1,
      ...(seed != null ? { seed: String(seed) } : {}),
    },
    nsfw,
    censor_nsfw: false,
    trusted_workers: false,
    slow_workers: true,
    r2: true,
  };

  const submit = await fetch(`${HORDE_BASE}/generate/async`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      "Client-Agent": "velvetmotion:1.0:https://velvetmotion-ai.hampusi97.workers.dev",
    },
    body: JSON.stringify(body),
  });

  if (!submit.ok) {
    const err = await submit.text();
    throw new Error(`Horde submit failed: ${submit.status} ${err.slice(0, 200)}`);
  }

  const { id } = (await submit.json()) as { id: string };
  if (!id) throw new Error("Horde returned no job id");

  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const check = await fetch(`${HORDE_BASE}/generate/check/${id}`, {
      headers: { apikey: ANON_KEY },
    });
    if (!check.ok) continue;
    const status = (await check.json()) as { done?: boolean; faulted?: boolean; wait_time?: number };
    if (status.faulted) throw new Error("Horde generation faulted");
    if (status.done) {
      const result = await fetch(`${HORDE_BASE}/generate/status/${id}`, {
        headers: { apikey: ANON_KEY },
      });
      if (!result.ok) throw new Error("Horde status fetch failed");
      const data = (await result.json()) as {
        generations?: { img?: string; censored?: boolean }[];
      };
      const img = data.generations?.[0]?.img;
      if (!img) throw new Error("Horde returned no image");
      return { url: img, note: data.generations?.[0]?.censored ? "Horde (censored)" : "AI Horde" };
    }
  }
  throw new Error("Horde generation timed out");
}
