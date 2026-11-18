import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCharacter } from "@/lib/characters";
import { characterPortraitUrl, type PortraitMood } from "@/lib/portraits";
import { characterMediaUrl } from "@/lib/media";

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
    const pose = typeof body.pose === "string" ? body.pose : "intimate cinematic motion, explicit";
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

    const isSex =
      /sex|fuck|riding|missionary|doggy|oral|explicit|undress|nude|naked/i.test(
        promptIn + " " + pose,
      );

    const basePrompt =
      promptIn.trim() ||
      [
        isSex
          ? "cinematic adult film sex sequence, photorealistic, explicit"
          : "cinematic slow-motion boudoir sequence, photorealistic",
        look,
        `${name} aesthetic, consistent subject`,
        pose,
        isSex
          ? "aroused expression, intimate motion, dramatic rim light, shallow depth of field"
          : "warm candlelight, shallow depth of field, 35mm film grain",
      ].join(", ");

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (keyIsReal(apiKey)) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanedBase64 = referenceImageBase64.replace(/^data:[^;]+;base64,/, "");

        const animateInstruction = cleanedBase64
          ? isSex
            ? `Animate this photo into a short explicit sex video. Keep the same woman. ${basePrompt}`
            : `Animate this photo into a sensual motion video. Keep the same woman. ${basePrompt}`
          : basePrompt;

        const inputPayload = cleanedBase64
          ? [
              {
                type: "image" as const,
                mime_type: referenceMimeType,
                data: cleanedBase64,
              },
              {
                type: "text" as const,
                text: animateInstruction,
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
        /* Fall back to 4-frame motion sequence */
      }
    }

    // 4-frame sex / boudoir sequence using consistent media engine
    const moods: Array<"beauty" | "lingerie" | "nude" | "explicit" | "sex"> = isSex
      ? ["lingerie", "nude", "explicit", "sex"]
      : ["beauty", "seductive" as any, "lingerie", "nude"];

    const stageLabels = isSex
      ? [
          `Frame 1/4 · Undress begins (${aspectRatio})`,
          `Frame 2/4 · Fully nude (${aspectRatio})`,
          `Frame 3/4 · Explicit pose (${aspectRatio})`,
          `Frame 4/4 · Sex climax still (${aspectRatio})`,
        ]
      : [
          `Frame 1/4 · Opening Gaze (${aspectRatio})`,
          `Frame 2/4 · Slow Motion Arch (${aspectRatio})`,
          `Frame 3/4 · Candlelight Peak (${aspectRatio})`,
          `Frame 4/4 · Velvet Afterglow (${aspectRatio})`,
        ];

    let frames: string[];
    if (character) {
      frames = moods.map((m, idx) =>
        characterMediaUrl(character, m as any, `${stageLabels[idx]} · ${pose}`),
      );
    } else {
      frames = (["beauty", "seductive", "lingerie", "explicit"] as PortraitMood[]).map((m, idx) =>
        characterPortraitUrl(
          `${name}-seq-${idx}`,
          look,
          m,
          `${stageLabels[idx]} · ${pose}`,
        ),
      );
    }

    // If user uploaded a custom photo, use it as the establishing keyframe
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
      note: isSex
        ? `Explicit 4-frame sex sequence ready (${aspectRatio}).`
        : `Animated 4-frame ${aspectRatio} sequence ready.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
