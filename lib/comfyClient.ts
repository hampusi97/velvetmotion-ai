/**
 * Optional local ComfyUI / Forge / Fooocus-style endpoints.
 * Browser CORS often blocks localhost — users may need a local proxy.
 * Inspired by StableCanvas/comfyui-client + ai-dock wrappers.
 */

import { getMediaSettings } from "./mediaSettings";

export type LocalGenRequest = {
  prompt: string;
  seed: number;
  width?: number;
  height?: number;
  negative?: string;
};

export type LocalGenResult = {
  ok: boolean;
  imageUrl?: string;
  note: string;
};

const DEFAULT_NEG =
  "low quality, blurry, deformed, extra fingers, watermark, text, logo, underage, child";

/** Try Forge/A1111 txt2img style API */
async function tryForge(base: string, req: LocalGenRequest): Promise<LocalGenResult> {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negative || DEFAULT_NEG,
        seed: req.seed,
        width: req.width || 768,
        height: req.height || 1152,
        steps: 20,
        cfg_scale: 5,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return { ok: false, note: `Forge HTTP ${res.status}` };
    const data = await res.json();
    const b64 = data.images?.[0];
    if (!b64) return { ok: false, note: "No image in Forge response" };
    return {
      ok: true,
      imageUrl: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
      note: "Local Forge/A1111",
    };
  } catch (e) {
    return {
      ok: false,
      note: `Forge failed (CORS or offline): ${e instanceof Error ? e.message : "error"}`,
    };
  }
}

/** Generic prompt-url style: POST {prompt,seed} → {url|image} */
async function tryCustom(base: string, req: LocalGenRequest): Promise<LocalGenResult> {
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: req.prompt,
        seed: req.seed,
        width: req.width || 768,
        height: req.height || 1152,
        negative_prompt: req.negative || DEFAULT_NEG,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return { ok: false, note: `Custom HTTP ${res.status}` };
    const data = await res.json();
    const url = data.url || data.image || data.images?.[0];
    if (!url) return { ok: false, note: "No url/image in response" };
    return { ok: true, imageUrl: url, note: "Custom local endpoint" };
  } catch (e) {
    return {
      ok: false,
      note: `Custom endpoint failed: ${e instanceof Error ? e.message : "error"}`,
    };
  }
}

export async function generateLocalImage(req: LocalGenRequest): Promise<LocalGenResult> {
  const s = getMediaSettings();
  if (!s.localImageBase) {
    return { ok: false, note: "Set Advanced → Local image base (Comfy/Forge URL)" };
  }
  if (s.localImageMode === "forge") return tryForge(s.localImageBase, req);
  if (s.localImageMode === "prompt-url") {
    // GET-style URL already handled in media.ts; for POST use custom
    return tryCustom(s.localImageBase, req);
  }
  // comfy: most workflows need workflow JSON — treat base as custom POST for now
  return tryCustom(s.localImageBase, req);
}
