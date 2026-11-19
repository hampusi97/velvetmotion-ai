import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import { checkContentSafety, checkRateLimit } from "@/lib/safety";

export const dynamic = "force-dynamic";

const STYLES: Record<string, string> = {
  portrait:
    "tasteful beauty portrait, soft cinematic lighting, sharp eyes, detailed skin texture, looking at viewer, magazine quality, seductive",
  lingerie:
    "wearing luxurious sheer lingerie, bedroom ambient light, seductive pose, photorealistic, detailed lace fabric, intimate atmosphere, cleavage, arched back",
  nude:
    "fully nude, naked body, bare breasts, visible nipples, natural skin detail, erotic photography, uncensored nsfw, soft shadows, highly detailed anatomy",
  explicit:
    "explicit nude, sexual pose, detailed genitals, wet skin, uncensored nsfw, photorealistic, studio quality lighting, sharp focus, aroused expression",
  video:
    "cinematic still from adult film, explicit sex scene, dramatic rim light, shallow depth of field, film grain, 35mm, intense",
};

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 800000000) + 100000;
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("api-generate-image", req, 40, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    const body = await req.json();
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const type = typeof body.type === "string" ? body.type : "portrait";
    const pose = typeof body.pose === "string" ? body.pose.slice(0, 400) : "looking at viewer, seductive";
    const extra = typeof body.extra === "string" ? body.extra.slice(0, 500) : "";
    const safety = checkContentSafety(`${pose} ${extra}`);
    if (!safety.allowed) {
      return NextResponse.json({ error: safety.reason, blocked: true }, { status: 400 });
    }
    const character = getCharacter(characterId);

    const look = character?.figure || "beautiful adult woman, proportionate figure";
    const name = character?.name || "companion";
    const style = STYLES[type] || STYLES.portrait;

    const prompt = [
      "masterpiece, best quality, ultra detailed, photorealistic",
      `beautiful adult woman 25 years old, ${look}`,
      `${name} aesthetic, consistent face and body`,
      style,
      pose,
      extra,
      "realistic skin pores, natural proportions, 8k uhd",
    ]
      .filter(Boolean)
      .join(", ");

    const custom = (process.env.AI_IMAGE_ENDPOINT || "").trim();
    const customKey = (process.env.AI_IMAGE_API_KEY || "").trim();
    if (custom) {
      try {
        const res = await fetch(custom, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(customKey ? { Authorization: `Bearer ${customKey}` } : {}),
          },
          body: JSON.stringify({ prompt, width: 768, height: 1152 }),
        });
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("json")) {
            const data = await res.json();
            const url = data.url || data.image || data.output?.[0];
            if (url) {
              return NextResponse.json({ success: true, url, prompt, source: "custom" });
            }
          }
        }
      } catch {
        /* fall through */
      }
    }

    // Character-biased seed + small jitter so she stays recognizable across gens
    const seed = seedFromId(characterId || name) + Math.floor(Math.random() * 40);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;

    return NextResponse.json({
      success: true,
      url,
      prompt,
      source: "pollinations",
      type,
      characterId: character?.id || characterId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
