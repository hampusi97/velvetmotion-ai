import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";

const STYLES: Record<string, string> = {
  portrait:
    "tasteful beauty portrait, soft cinematic lighting, sharp eyes, detailed skin texture, looking at viewer, magazine quality",
  lingerie:
    "wearing luxurious lingerie, bedroom ambient light, seductive pose, photorealistic, detailed fabric, intimate atmosphere",
  nude:
    "fully nude, naked body, bare breasts, natural skin detail, erotic fine-art photography, tasteful nsfw, soft shadows, highly detailed",
  explicit:
    "explicit nude, sexual pose, detailed anatomy, uncensored nsfw, photorealistic, studio quality lighting, sharp focus",
  video:
    "cinematic still from adult film, explicit scene, dramatic rim light, shallow depth of field, film grain, 35mm",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const type = typeof body.type === "string" ? body.type : "portrait";
    const pose = typeof body.pose === "string" ? body.pose : "looking at viewer, seductive";
    const extra = typeof body.extra === "string" ? body.extra : "";
    const character = getCharacter(characterId);

    const look = character?.figure || "beautiful adult woman, proportionate figure";
    const name = character?.name || "companion";
    const style = STYLES[type] || STYLES.portrait;

    let prompt = [
      "masterpiece, best quality, ultra detailed",
      `beautiful adult woman 25 years old, ${look}`,
      `${name} aesthetic`,
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

    const seed = Math.floor(Math.random() * 1e9);
    // Classic free image API — enhance for quality
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
