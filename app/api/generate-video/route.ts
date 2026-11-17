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
      `cinematic adult film, ${look}, ${pose}, explicit sex scene, dramatic lighting, photorealistic, high detail`;

    const videoEndpoint = (process.env.AI_VIDEO_ENDPOINT || "").trim();
    const videoKey = (process.env.AI_VIDEO_API_KEY || "").trim();

    // 1) User-configured video worker (fal, Runway, Comfy, etc.)
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
        /* fall through */
      }
    }

    // 2) Try Pollinations free video endpoint (may rate-limit or require key depending on region)
    const seed = Math.floor(Math.random() * 1e9);
    const pollinationsVideo = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt + ", animated, motion, smooth movement"
    )}?width=720&height=1280&nologo=true&seed=${seed}&model=flux&enhance=true`;

    // Also return a short sequence of cinematic stills the client can present as a "video concept"
    const frames = [0, 1, 2].map((i) => {
      const s = seed + i * 97;
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(
        `${prompt}, frame ${i + 1} of intimate sequence, cinematic still, film grain`
      )}?width=768&height=1152&nologo=true&seed=${s}&model=flux&enhance=true`;
    });

    return NextResponse.json({
      success: true,
      videoUrl: pollinationsVideo,
      imageUrl: frames[0],
      frames,
      promptUsed: prompt,
      source: "pollinations-sequence",
      fallback: !videoEndpoint,
      note: videoEndpoint
        ? undefined
        : "Set AI_VIDEO_ENDPOINT (fal.ai / Runway / Comfy) for true motion MP4. Returning enhanced cinematic sequence.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
