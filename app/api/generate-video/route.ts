import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCharacter } from "@/lib/characters";
import { characterPortraitUrl, type PortraitMood } from "@/lib/portraits";
import { characterMediaUrl, mediaSeed } from "@/lib/media";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function keyIsReal(key: string) {
  return key.length > 15 && !/dummy|your_|changeme|placeholder/i.test(key);
}

function pollinationsFrame(
  prompt: string,
  seed: number,
  width = 768,
  height = 1152,
): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux&enhance=true`;
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
    const w = aspectRatio === "16:9" ? 1152 : 768;
    const h = aspectRatio === "16:9" ? 768 : 1152;

    const isSex =
      /sex|fuck|riding|missionary|doggy|oral|explicit|undress|nude|naked/i.test(
        promptIn + " " + pose,
      );

    const basePrompt =
      promptIn.trim() ||
      [
        isSex
          ? "cinematic adult film sex sequence, photorealistic, explicit, uncensored"
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

    // 4-frame sex / boudoir sequence — Pollinations Flux for real NSFW stills
    const stages = isSex
      ? [
          `Frame 1 undress begins, lingerie half-off, ${pose}`,
          `Frame 2 fully nude, seductive, ${pose}`,
          `Frame 3 explicit sexual pose, detailed, ${pose}`,
          `Frame 4 sex climax still, intense, explicit, ${pose}`,
        ]
      : [
          `Frame 1 opening gaze, ${pose}`,
          `Frame 2 slow motion arch, ${pose}`,
          `Frame 3 candlelight peak, ${pose}`,
          `Frame 4 velvet afterglow, ${pose}`,
        ];

    const baseSeed = character
      ? mediaSeed(character.id, isSex ? "sex" : "beauty")
      : Math.floor(Math.random() * 900000);

    let frames: string[];
    if (character) {
      frames = stages.map((stage, idx) => {
        const prompt = [
          "masterpiece, best quality, ultra detailed, photorealistic",
          look,
          `${name} aesthetic, consistent face and body`,
          basePrompt,
          stage,
          "no text, no watermark",
        ].join(", ");
        return pollinationsFrame(prompt, baseSeed + idx * 17, w, h);
      });
    } else {
      frames = (["beauty", "seductive", "lingerie", "explicit"] as PortraitMood[]).map((m, idx) =>
        characterPortraitUrl(`${name}-seq-${idx}`, look, m, stages[idx]),
      );
    }

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
      source: "pollinations-flux-sequence",
      fallback: true,
      note: isSex
        ? `Explicit 4-frame sex sequence (${aspectRatio}). Set AI_VIDEO_ENDPOINT or GEMINI_API_KEY for real MP4.`
        : `Animated 4-frame ${aspectRatio} sequence ready.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
