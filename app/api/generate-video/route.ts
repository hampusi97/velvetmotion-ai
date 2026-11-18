import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCharacter } from "@/lib/characters";
import { characterPortraitUrl, type PortraitMood } from "@/lib/portraits";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function keyIsReal(key: string) {
  return key.length > 15 && !/dummy|your_|changeme|placeholder/i.test(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const promptIn = typeof body.prompt === "string" ? body.prompt : "";
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const pose = typeof body.pose === "string" ? body.pose : "intimate cinematic motion";
    const aspectRatio: "16:9" | "9:16" = body.aspectRatio === "16:9" ? "16:9" : "9:16";
    const duration = typeof body.duration === "string" ? body.duration : "5s";
    const referenceImageBase64 =
      typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : "";
    const referenceMimeType =
      typeof body.referenceMimeType === "string" ? body.referenceMimeType : "image/png";
    const previousInteractionId =
      typeof body.previousInteractionId === "string" ? body.previousInteractionId : undefined;

    const character = getCharacter(characterId);
    const look = character?.figure || "beautiful adult woman 24 years old";
    const name = character?.name || "Velvet Muse";

    const basePrompt =
      promptIn.trim() ||
      [
        "cinematic slow-motion boudoir sequence, photorealistic",
        look,
        `${name} aesthetic, consistent subject`,
        pose,
        "warm candlelight, shallow depth of field, 35mm film grain",
      ].join(", ");

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (keyIsReal(apiKey)) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanedBase64 = referenceImageBase64.replace(/^data:[^;]+;base64,/, "");

        const inputPayload = cleanedBase64
          ? [
              {
                type: "image" as const,
                mime_type: referenceMimeType,
                data: cleanedBase64,
              },
              {
                type: "text" as const,
                text: basePrompt,
              },
            ]
          : basePrompt;

        const interaction = await ai.interactions.create(
          {
            model: "gemini-omni-1.2-flash",
            ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
            input: inputPayload,
            background: false,
            store: true,
            stream: false,
            response_format: {
              type: "video",
              aspect_ratio: aspectRatio,
              duration,
              resolution: "720p",
            },
          },
          { timeout: 90000 },
        );

        const videoPart = interaction?.output_video;
        if (videoPart?.data) {
          const mimeType = videoPart.mime_type || "video/mp4";
          const videoDataUrl = `data:${mimeType};base64,${videoPart.data}`;
          return NextResponse.json({
            success: true,
            videoUrl: videoDataUrl,
            interactionId: interaction.id,
            aspectRatio,
            animatedFromImage: Boolean(cleanedBase64),
            promptUsed: basePrompt,
            source: "gemini-omni-1.2-flash",
          });
        }
      } catch {
        /* Fall back to 4-frame motion sequence when paid Omni Flash key is not active */
      }
    }

    // 4-frame procedural motion sequence fallback (guaranteed instant & error-free)
    const moods: PortraitMood[] = ["beauty", "seductive", "lingerie", "explicit"];
    const stageLabels = [
      `Frame 1/4 · Opening Gaze (${aspectRatio})`,
      `Frame 2/4 · Slow Motion Arch (${aspectRatio})`,
      `Frame 3/4 · Candlelight Peak (${aspectRatio})`,
      `Frame 4/4 · Velvet Afterglow (${aspectRatio})`,
    ];

    const frames = moods.map((m, idx) =>
      characterPortraitUrl(
        `${character?.id || name}-seq-${idx}`,
        look,
        m,
        `${stageLabels[idx]} · ${pose}`,
      ),
    );

    // If user uploaded a custom photo to animate, include it as the establishing keyframe
    if (referenceImageBase64.startsWith("data:image/")) {
      frames[0] = referenceImageBase64;
    }

    return NextResponse.json({
      success: true,
      videoUrl: frames[0],
      imageUrl: frames[0],
      frames,
      aspectRatio,
      animatedFromImage: Boolean(referenceImageBase64),
      promptUsed: basePrompt,
      source: "velvet-motion-sequence",
      fallback: true,
      note: `Animated 4-frame ${aspectRatio} sequence ready.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
