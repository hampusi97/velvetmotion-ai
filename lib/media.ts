/**
 * VelvetMotion Media Engine
 * Beauty/seductive → Cloudflare Flux worker.
 * NSFW moods → AI Horde (free, nsfw:true) with Pollinations fallback.
 * Quality presets applied to all paths.
 */

import type { Character } from "./charactersTypes";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { getCharacterFaceSeed, getMediaSettings } from "./mediaSettings";
import { loadRouterSettings } from "./chatRouter";
import { generateComfySfwPortrait, probeComfyUi } from "./comfyBridge";
import { generateLocalImage } from "./comfyClient";
import { generateHordeImage } from "./aiHorde";
import { fetchWorkerImage } from "./imageWorker";
import { remoteImageToStableDataUrl, toStableDataUrl } from "./imageStore";
import { checkContentSafety } from "./safety";
import { reportGenerationSpeed } from "./localEngineBridge";
import { QUALITY_PROMPT, IMAGE_WIDTH, IMAGE_HEIGHT } from "./quality";

export type MediaMood =
  | "beauty"
  | "lingerie"
  | "nude"
  | "explicit"
  | "sex"
  | "seductive"
  | "aftercare"
  | "dual"
  | "sph"
  | "bnwo"
  | "joi"
  | "joi-finish"
  | "scene";

export interface ResolvedMediaResult {
  url: string;
  note: string;
  isFallback?: boolean;
  error?: string;
  seed?: number;
  engine?: string;
}

const NSFW_MOODS = new Set<MediaMood>(["nude", "explicit", "sex", "joi", "joi-finish", "sph", "bnwo", "dual"]);

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function randomGenerationSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

export function faceSeed(character: Pick<Character, "id" | "figure" | "name">): number {
  const stored = getCharacterFaceSeed(character.id);
  if (stored != null) return stored;
  return Math.abs(hashCode(character.id + "|face|" + (character.figure || "").slice(0, 160))) % 100000;
}

export function seedFromPhotoDataUrl(dataUrl: string): number {
  const slice = dataUrl.slice(0, 400) + dataUrl.slice(-200);
  return Math.abs(hashCode(slice)) % 100000;
}

const PHOTO_BASE = QUALITY_PROMPT;

const MOOD_PROMPTS: Record<MediaMood, string> = {
  beauty: PHOTO_BASE + " Natural makeup, soft ambient indoor light, influencer editorial close-up, intimate and warm.",
  seductive: PHOTO_BASE + " Intimate close-up, warm bedside lamp + soft rim light. Heavy-lidded eyes, parted glossy lips, slight head tilt, flushed cheeks. Soft shadows, realistic skin sheen with pores.",
  lingerie: PHOTO_BASE + " Mirror selfie, sheer lace lingerie slightly off shoulder, soft side window light. Looking over shoulder, natural skin texture, soft bokeh background, candid influencer aesthetic, authentic body.",
  nude: PHOTO_BASE + " Fully nude adult woman, no clothes, naked body, bare breasts, soft window light, natural skin texture with pores, looking at camera, photoreal, 21+.",
  explicit: PHOTO_BASE + " Explicit nude adult woman, naked, bare breasts, detailed anatomy, flushed, intense eye contact, uncensored photoreal, 21+.",
  sex: PHOTO_BASE + " Explicit intimate adult scene, sweaty realistic skin texture with pores, pleasure expression, detailed anatomy. Cinematic practical lighting, uncensored photoreal, natural proportions, 21+.",
  aftercare: PHOTO_BASE + " Post-intimacy, soft morning light through sheer curtains. Soft smile, messy hair, warm skin tones, realistic pores and glow. Intimate, tender, photoreal, gentle.",
  dual: PHOTO_BASE + " Two adult women together, soft shared warm lighting, both looking at viewer. Natural skin texture on both, warm bedroom atmosphere, photoreal, intimate, 21+.",
  sph: PHOTO_BASE + " Dominant adult woman looking down from above, low angle. Amused or commanding smile, pointing or gesturing. Natural skin texture, soft overhead light, sharp eyes, 21+.",
  bnwo: PHOTO_BASE + " Dominant Black adult woman, confident direct gaze, natural skin sheen with pores, gold jewelry. Warm directional light, photoreal adult, powerful presence, 21+.",
  joi: PHOTO_BASE + " Adult woman giving JOI, pointing at camera, intense eye contact. Seductive pose in lingerie or nude. Soft bedroom light, realistic skin, sharp face, 21+.",
  "joi-finish": PHOTO_BASE + " Close-up face and upper body, open mouth, intense eye contact. Nude or open lingerie. Soft flash or warm light, wet lips, realistic skin texture, 21+.",
  scene: PHOTO_BASE + " Candid realistic scene, atmospheric editorial lighting, natural pose and authentic skin texture with pores, 21+.",
};

type PromptCharacter = Pick<Character, "id" | "name" | "figure" | "age"> & { visualDna?: string };

function buildPrompt(character: PromptCharacter, mood: MediaMood, extra = ""): string {
  const visualDna = character.visualDna || character.figure || "beautiful adult woman with unique distinctive face, natural features, photoreal";
  return [
    visualDna,
    `adult woman ${character.age || 24} years old, 21+`,
    `${character.name}, same face every shot, consistent identity lock, unique facial features, distinctive look`,
    MOOD_PROMPTS[mood],
    extra,
    "looking at viewer, sharp focused eyes, natural proportions, high detail skin texture with pores, photoreal, no plastic skin, no AI artifacts",
  ]
    .filter(Boolean)
    .join(". ");
}

async function tryHomeEngineImage(
  homeBase: string,
  prompt: string,
  seed: number,
): Promise<{ ok: true; url: string; note: string } | { ok: false; detail?: string }> {
  const cleanBase = homeBase.replace(/\/+$/, "");
  try {
    const health = await fetch(`${cleanBase}/api/health`, { signal: AbortSignal.timeout(750) });
    if (!health.ok) return { ok: false };
  } catch {
    return { ok: false };
  }

  try {
    const res = await fetch(`${cleanBase}/api/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, steps: 20, seed }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      return { ok: false, detail: `Home Engine HTTP ${res.status}` };
    }
    const ctype = res.headers.get("content-type") || "";
    if (ctype.startsWith("image/")) {
      return { ok: true, url: await toStableDataUrl(await res.blob()), note: "Home Engine (Local GPU)" };
    }
    const data = (await res.json().catch(() => null)) as { imageUrl?: string; url?: string; error?: string } | null;
    const outUrl = data?.imageUrl || data?.url;
    if (outUrl) return { ok: true, url: outUrl, note: "Home Engine (Local GPU)" };
    return { ok: false, detail: data?.error || "Home Engine returned no image" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Home Engine failed" };
  }
}

export function characterMediaUrl(character: Pick<Character, "id" | "name" | "figure" | "age">, _mood: MediaMood = "beauty", _extra = "", _opts?: { seedOverride?: number; preferStatic?: boolean }): string {
  // Static safe portrait reference
  return staticPortraitUrl(character.id || "chloe");
}

export async function resolveBestMediaUrl(
  character: PromptCharacter,
  mood: MediaMood = "beauty",
  extra = "",
): Promise<ResolvedMediaResult> {
  const safety = checkContentSafety(`${character.name} ${character.visualDna || character.figure || ""} ${extra}`);
  if (!safety.allowed) {
    const reason = safety.reason || "Blocked by safety policy";
    return { url: staticPortraitUrl(character.id || "chloe"), note: reason, isFallback: true, error: reason };
  }

  const prompt = buildPrompt(character, mood, extra);
  const settings = typeof window !== "undefined" ? getMediaSettings() : null;
  // A shared face seed keeps companion identity more stable across generations.
  const base = settings?.aggressiveFaceLock
    ? Math.max(1, faceSeed(character))
    : randomGenerationSeed();
  // Add a random offset so each generation differs even with face lock on.
  const seed = (base + Math.floor(Math.random() * 999_999)) % 2_000_000_000 || 1;
  // Never route mature requests through the general-purpose, SFW-only worker.
  const requiresAdultEngine = NSFW_MOODS.has(mood) || /\b(nude|nudity|explicit|nsfw|sexual)\b/i.test(extra);
  const routerSettings = typeof window !== "undefined" ? loadRouterSettings() : { provider: "auto" as const };
  const errors: string[] = [];

  const t0 = Date.now();
  const reportImg = (engine: string) => {
    const sec = Number(Math.max(0.2, (Date.now() - t0) / 1000).toFixed(1));
    reportGenerationSpeed({ imgSec: sec, lastEngine: engine });
  };

  if (typeof window !== "undefined") {
    // Priority 1A: Local ComfyUI Bridge (:8188 SFW creative outfit/scene portraits) when online
    const comfyBase = (settings?.localImageBase || "http://127.0.0.1:8188").trim();
    const comfyProbe = await probeComfyUi(comfyBase);

    // MyGirlGPT-style: Stable Diffusion web UI on :7860
    let sdOnline = false;
    try {
      const sd = await fetch("http://127.0.0.1:7860/sdapi/v1/options", { signal: AbortSignal.timeout(800) });
      sdOnline = sd.ok;
    } catch { /* offline */ }
    if (sdOnline && requiresAdultEngine) {
      try {
        const body = {
          prompt,
          negative_prompt: "clothes, clothing, dress, shirt, bra, underwear, censored, blurry, low quality",
          steps: 20,
          width: 512,
          height: 768,
          cfg_scale: 7,
          seed,
        };
        const res = await fetch("http://127.0.0.1:7860/sdapi/v1/txt2img", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json() as { images?: string[] };
          if (data.images?.[0]) {
            const dataUrl = `data:image/png;base64,${data.images[0]}`;
            reportImg("sd-webui");
            return { url: dataUrl, note: "Local SD web UI (:7860)", seed, engine: "sd-webui" };
          }
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "SD web UI failed");
      }
    }
    if (comfyProbe.online) {
      try {
        const blobUrl = await generateComfySfwPortrait({
          comfyUrl: comfyBase,
          prompt,
          checkpointName: comfyProbe.checkpoints[0],
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          seed,
        });
        const stableUrl = await remoteImageToStableDataUrl(blobUrl).catch(() => blobUrl);
        reportImg("comfyui-bridge");
        return {
          url: stableUrl,
          note: `Local ComfyUI (${comfyProbe.checkpoints[0] || "SDXL/FLUX"})`,
          seed,
          engine: "comfyui-bridge",
        };
      } catch (e) {
        if (e instanceof Error && !/offline/i.test(e.message)) {
          errors.push(e.message);
        }
      }
    }

    // Priority 1B: Local RTX / ComfyUI direct uncensored or Home Engine (:8787 / Tunnel)
    const localRes = await generateLocalImage(
      { prompt, seed, width: IMAGE_WIDTH, height: IMAGE_HEIGHT, characterId: character.id },
      comfyBase,
    );
    if (localRes.ok && localRes.imageUrl) {
      reportImg("local-gpu");
      return { url: localRes.imageUrl, note: localRes.note, seed, engine: "local-gpu" };
    }
    if (localRes.note && !/offline/i.test(localRes.note)) {
      errors.push(localRes.note);
    }

    const homeBase = (routerSettings.homeEngineUrl || "http://127.0.0.1:8787").trim();
    if (homeBase) {
      const homeRes = await tryHomeEngineImage(homeBase, prompt, seed);
      if (homeRes.ok) {
        reportImg("home-engine");
        return { url: homeRes.url, note: homeRes.note, seed, engine: "home-engine" };
      }
      if (homeRes.detail) errors.push(homeRes.detail);
    }

    // Priority 2: Cloudflare Image Worker (Flux-1-Schnell GET /generate?prompt=...&steps=8&seed=...)
    if (!requiresAdultEngine) {
      const worker = await fetchWorkerImage(prompt, { steps: 8, seed });
      if (worker.ok) {
        reportImg("cf-flux");
        return { url: worker.url, note: "Cloudflare Flux-1-Schnell", seed, engine: "cf-flux" };
      }
      errors.push(`Flux Worker (${worker.reason}): ${worker.detail}`);
    }

    // Priority 3: AI Horde Fallback (strictly capped <= 512x768, 20 steps, n=1 for 0-kudos compatibility)
    try {
      const horde = await generateHordeImage({
        prompt,
        seed,
        nsfw: requiresAdultEngine,
        width: 512,
        height: 768,
        steps: 20,
        apiKey: routerSettings.aiHordeApiKey,
      });
      try {
        const stableUrl = await remoteImageToStableDataUrl(horde.url);
        reportImg("ai-horde");
        return { url: stableUrl, note: horde.note, seed, engine: "ai-horde" };
      } catch {
        reportImg("ai-horde");
        return { url: horde.url, note: horde.note, seed, engine: "ai-horde" };
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "AI Horde failed");
    }

    // Priority 4: Pollinations classic (safe=false) for NSFW when Horde censors
    if (requiresAdultEngine) {
      try {
        const p = encodeURIComponent(prompt.slice(0, 400));
        const url = `https://image.pollinations.ai/prompt/${p}?width=512&height=768&seed=${seed}&safe=false&nologo=true`;
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok && res.headers.get("content-type")?.includes("image")) {
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(blob);
          });
          reportImg("pollinations-nsfw");
          return { url: dataUrl, note: "Pollinations (uncensored)", seed, engine: "pollinations-nsfw" };
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Pollinations failed");
      }
    }

    const reason = errors.join(" · ") || "All compatible image generators are offline, unsupported, or rate-limited";
    return {
      url: staticPortraitUrl(character.id || "chloe"),
      note: "Live generation unavailable",
      isFallback: true,
      error: reason,
      seed,
    };
  }

  return { url: characterMediaUrl(character, mood, extra), note: "Static preview portrait", isFallback: true };
}

export function joiSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "joi", "start"), characterMediaUrl(c, "joi", "pace"), characterMediaUrl(c, "seductive", "almost"), characterMediaUrl(c, "joi-finish", "finish")];
}
export function sphSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "sph", "look"), characterMediaUrl(c, "sph", "point"), characterMediaUrl(c, "explicit", "tease"), characterMediaUrl(c, "sph", "verdict")];
}
export function bnwoSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "bnwo", "enter"), characterMediaUrl(c, "bnwo", "stand"), characterMediaUrl(c, "lingerie", "control"), characterMediaUrl(c, "bnwo", "claim")];
}
export function sexSequenceFrames(c: Pick<Character, "id" | "name" | "figure" | "age">): string[] {
  return [characterMediaUrl(c, "lingerie", "start"), characterMediaUrl(c, "nude", "aroused"), characterMediaUrl(c, "explicit", "intense"), characterMediaUrl(c, "sex", "climax")];
}

export function characterGallery(character: Character) {
  const moods: { mood: MediaMood; label: string }[] = [
    { mood: "beauty", label: "Beauty" }, { mood: "seductive", label: "Seductive" }, { mood: "lingerie", label: "Lingerie" },
    { mood: "nude", label: "Nude" }, { mood: "explicit", label: "Explicit" }, { mood: "sex", label: "Sex" },
    { mood: "joi", label: "JOI" }, { mood: "sph", label: "SPH" }, { mood: "bnwo", label: "BNWO" }, { mood: "aftercare", label: "Aftercare" },
  ];
  return moods.map(({ mood, label }) => ({ mood, label, url: characterMediaUrl(character, mood) }));
}

export function resolveCharacterAvatar(character: Character): string {
  if (character.avatar?.startsWith("http") || character.avatar?.startsWith("data:")) return character.avatar;
  return characterMediaUrl(character, "beauty");
}

export function freeformImageUrl(_prompt: string, character?: Pick<Character, "id" | "figure" | "name">, _seedExtra = ""): string {
  // No Pollinations. Return a local portrait.
  const id = character?.id || "chloe";
  const known = ["chloe","elena","aria","sienna","raven","yuki","scarlett","mia","genevieve","briony","calla","freya","isolde","liora","maren","nadine","nova","tess","vesper"];
  if (known.includes(id)) return `/portraits/${id}.jpg`;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `/portraits/${known[Math.abs(h) % known.length]}.jpg`;
}
