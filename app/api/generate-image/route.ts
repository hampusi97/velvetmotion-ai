import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCharacter } from "@/lib/characters";
import { characterPortraitUrl, type PortraitMood } from "@/lib/portraits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STYLES: Record<string, string> = {
  portrait:
    "tasteful beauty portrait, soft cinematic lighting, sharp eyes, detailed skin texture, looking at viewer, magazine quality, seductive expression",
  lingerie:
    "wearing luxurious sheer lingerie, bedroom ambient light, seductive pose, photorealistic, detailed fabric and lace, intimate atmosphere, arched back",
  nude:
    "fully nude, artistic erotic fine-art photography, natural skin detail, soft shadows, looking at viewer",
  explicit:
    "intimate boudoir photography, dramatic neon rim light, high contrast, aroused expression",
  video:
    "cinematic still from adult film, dramatic rim light, shallow depth of field, film grain, 35mm",
};

function keyIsReal(key: string) {
  return key.length > 15 && !/dummy|your_|changeme|placeholder/i.test(key);
}

function mapTypeToMood(type: string): PortraitMood {
  if (type === "lingerie") return "lingerie";
  if (type === "nude") return "nude";
  if (type === "explicit") return "explicit";
  if (type === "portrait") return "beauty";
  return "seductive";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const type = typeof body.type === "string" ? body.type : "portrait";
    const pose = typeof body.pose === "string" ? body.pose : "looking at viewer, seductive";
    const extra = typeof body.extra === "string" ? body.extra : "";
    const dual = typeof body.dual === "string" ? body.dual : "";
    const aspectRatio = body.aspectRatio === "16:9" || body.aspectRatio === "1:1" ? body.aspectRatio : "9:16";
    const referenceImageBase64 =
      typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : "";
    const referenceMimeType =
      typeof body.referenceMimeType === "string" ? body.referenceMimeType : "image/png";

    const character = getCharacter(characterId);
    const look = character?.figure || (typeof body.figure === "string" ? body.figure : "beautiful adult woman");
    const name = character?.name || (typeof body.name === "string" ? body.name : "Velvet Muse");
    const style = STYLES[type] || STYLES.portrait;

    const dualPart = dual
      ? `two beautiful adult women together, ${look}, and second woman ${dual}, intimate dual scene`
      : look;

    const prompt = [
      "masterpiece, best quality, ultra detailed, photorealistic",
      "beautiful adult woman 24 years old",
      dualPart,
      `${name} aesthetic, consistent face and body`,
      style,
      pose,
      extra,
      "realistic skin pores, natural proportions, 8k uhd",
    ]
      .filter(Boolean)
      .join(", ");

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (keyIsReal(apiKey)) {
      const ai = new GoogleGenAI({ apiKey });
      const cleanedBase64 = referenceImageBase64.replace(/^data:[^;]+;base64,/, "");
      const modelsToTry = ["gemini-nano-banana-2.1", "gemini-3.1-flash-lite-image"];

      for (const modelName of modelsToTry) {
        try {
          const inputPayload = cleanedBase64
            ? [
                {
                  type: "image" as const,
                  data: cleanedBase64,
                  mime_type: referenceMimeType,
                },
                {
                  type: "text" as const,
                  text: extra.trim() || `Edit this image into: ${prompt}`,
                },
              ]
            : prompt;

          const interaction = await ai.interactions.create({
            model: modelName,
            input: inputPayload,
            response_modalities: ["image", "text"],
            generation_config: {
              image_config: {
                aspect_ratio: aspectRatio === "9:16" ? "1:1" : aspectRatio,
                image_size: "1K",
              },
            },
          });

          const steps = Array.isArray(interaction?.steps) ? interaction.steps : [];
          for (const step of steps) {
            if (step.type === "model_output" && Array.isArray(step.content)) {
              const imageContent = step.content.find((c) => c.type === "image");
              if (imageContent && "data" in imageContent && imageContent.data) {
                const mimeType =
                  ("mime_type" in imageContent && imageContent.mime_type) || "image/png";
                const url = `data:${mimeType};base64,${imageContent.data}`;
                return NextResponse.json({
                  success: true,
                  url,
                  prompt,
                  source: modelName,
                  edited: Boolean(cleanedBase64),
                  type,
                  characterId: character?.id || characterId,
                });
              }
            }
          }
        } catch {
          /* fall through to next model or procedural editorial renderer */
        }
      }
    }

    // Procedural mood-reactive editorial portrait fallback (never fails or 402s)
    const mood = mapTypeToMood(type);
    const labelSummary = [pose, extra].filter(Boolean).join(" · ") || style;
    const url = characterPortraitUrl(
      `${character?.id || name}-${Date.now() % 1000}`,
      look,
      mood,
      labelSummary,
    );

    return NextResponse.json({
      success: true,
      url,
      prompt,
      source: "velvet-editorial-engine",
      edited: Boolean(referenceImageBase64),
      type,
      characterId: character?.id || characterId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
