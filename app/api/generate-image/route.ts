import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";

const STYLES: Record<string, string> = {
  portrait: "tasteful portrait, soft light, looking at viewer, high detail",
  lingerie: "wearing sexy lingerie, bedroom, seductive, photorealistic",
  nude: "fully nude, naked, bare breasts, erotic photography, detailed skin, nsfw",
  explicit: "explicit nude, sexual pose, detailed anatomy, uncensored nsfw, photorealistic",
  video: "cinematic still from adult film, explicit, dramatic lighting, motion suggestion",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const type = typeof body.type === "string" ? body.type : "portrait";
    const pose = typeof body.pose === "string" ? body.pose : "looking at viewer, seductive";
    const extra = typeof body.extra === "string" ? body.extra : "";
    const character = getCharacter(characterId);

    const look = character?.figure || "beautiful adult woman";
    const name = character?.name || "companion";
    const style = STYLES[type] || STYLES.portrait;

    let prompt = `beautiful adult woman 21+ years old, ${look}, ${name} vibe, ${style}, ${pose}`;
    if (extra) prompt += `, ${extra}`;
    prompt += ", realistic, 8k, sharp focus";

    // Optional custom Stable Diffusion / Comfy endpoint
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
          body: JSON.stringify({ prompt, width: 768, height: 1024 }),
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
        // fall through
      }
    }

    // Pollinations (free, no key)
    const seed = Math.floor(Math.random() * 1e9);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&nologo=true&seed=${seed}&model=flux`;

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
