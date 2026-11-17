import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const promptIn = typeof body.prompt === "string" ? body.prompt : "";
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const pose = typeof body.pose === "string" ? body.pose : "intimate cinematic scene";
    const character = getCharacter(characterId);

    const look = character?.figure || "beautiful adult woman";
    const prompt =
      promptIn.trim() ||
      `cinematic adult film still, ${look}, ${pose}, explicit, dramatic lighting, photorealistic`;

    const videoEndpoint = (process.env.AI_VIDEO_ENDPOINT || "").trim();
    const videoKey = (process.env.AI_VIDEO_API_KEY || "").trim();

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
            prompt,
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
              promptUsed: prompt,
              source: "external-worker",
            });
          }
        }
      } catch {
        // fall through to image still
      }
    }

    // Fallback: cinematic explicit still via Pollinations (labeled as video concept)
    const seed = Math.floor(Math.random() * 1e9);
    const stillUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt + ", motion blur, film grain, cinematic still from sex scene"
    )}?width=768&height=1024&nologo=true&seed=${seed}&model=flux`;

    return NextResponse.json({
      success: true,
      videoUrl: stillUrl,
      imageUrl: stillUrl,
      promptUsed: prompt,
      source: "cinematic-still",
      fallback: true,
      note: "Set AI_VIDEO_ENDPOINT for real motion video. Returning cinematic still.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
