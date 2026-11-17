import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Stable-ish seed from character id so sequences feel same-person. */
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 900000000) + 100000;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const promptIn = typeof body.prompt === "string" ? body.prompt : "";
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const pose = typeof body.pose === "string" ? body.pose : "intimate cinematic scene";
    const character = getCharacter(characterId);

    const look = character?.figure || "beautiful adult woman 25 years old";
    const name = character?.name || "companion";
    const base =
      promptIn.trim() ||
      [
        "masterpiece, best quality, photorealistic adult film still",
        look,
        `${name} aesthetic, same woman throughout`,
        pose,
        "explicit sex scene, detailed anatomy, uncensored nsfw",
        "cinematic lighting, shallow depth of field, film grain, 35mm",
      ].join(", ");

    const videoEndpoint = (process.env.AI_VIDEO_ENDPOINT || "").trim();
    const videoKey = (process.env.AI_VIDEO_API_KEY || "").trim();

    // 1) Real motion worker when configured
    if (videoEndpoint) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        const externalRes = await fetch(videoEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(videoKey ? { Authorization: `Bearer ${videoKey}` } : {}),
          },
          body: JSON.stringify({
            prompt: base,
            aspect_ratio: body.aspectRatio || "9:16",
            num_frames: 48,
            fps: 24,
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (externalRes.ok) {
          const data = await externalRes.json();
          const videoUrl = data.video_url || data.url || data.output?.[0];
          if (videoUrl) {
            return NextResponse.json({
              success: true,
              videoUrl,
              promptUsed: base,
              source: "external-worker",
            });
          }
        }
      } catch {
        /* fall through */
      }
    }

    // 2) Free cinematic multi-frame sequence (Pollinations Flux)
    // Same base seed per character so face/body stays more consistent across frames.
    const baseSeed = seedFromId(characterId || "default") + Math.floor(Math.random() * 50);
    const framePrompts = [
      `${base}, opening frame, establishing shot, looking at viewer`,
      `${base}, mid sequence, motion, intimate angle, arched back`,
      `${base}, climax frame, explicit, intense expression, film grain`,
      `${base}, afterglow frame, soft light, satisfied, close-up face`,
    ];

    const frames = framePrompts.map((p, i) => {
      const s = baseSeed + i * 17;
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(
        p
      )}?width=768&height=1152&nologo=true&seed=${s}&model=flux&enhance=true`;
    });

    return NextResponse.json({
      success: true,
      videoUrl: frames[0],
      imageUrl: frames[0],
      frames,
      promptUsed: base,
      source: "pollinations-sequence",
      fallback: !videoEndpoint,
      note: videoEndpoint
        ? undefined
        : "Cinematic 4-frame sex sequence (free). Set AI_VIDEO_ENDPOINT for real MP4 motion.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
