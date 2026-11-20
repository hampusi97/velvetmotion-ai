/**
 * Reference-aware image variants for original fictional adult artwork.
 * No source photo is sent anywhere until the user explicitly clicks Generate.
 * Client checks are UX guardrails, not production-grade identity verification.
 */
import { assertCompliance } from "./complianceFilter";
import { generateLocalImage } from "./comfyClient";
import { getMediaSettings } from "./mediaSettings";

export type ReferenceVariation = {
  imageUrl: string;
  engine: string;
};

export async function generateFictionalReferenceVariation({
  referenceImage,
  prompt,
  adultMode,
  sourceType,
}: {
  referenceImage: string;
  prompt: string;
  adultMode: boolean;
  sourceType: "fictional" | "real-person";
}): Promise<ReferenceVariation> {
  if (sourceType !== "fictional") {
    throw new Error("Reference-based fantasy generation only accepts original fictional adult artwork.");
  }
  if (!referenceImage.startsWith("data:image/")) {
    throw new Error("Please upload an original fictional JPG, PNG or WebP image.");
  }
  const compliance = assertCompliance(prompt);
  if (!compliance.ok) throw new Error(compliance.reason);
  const settings = getMediaSettings();
  const seed = Math.floor(Math.random() * 2147483000) + 1;
  const fullPrompt = [
    "Original fictional adult character, maintain visual identity and facial features",
    prompt.trim() || "cinematic editorial portrait, realistic studio lighting",
    "high-quality composition",
  ].join(", ");

  if (settings.img2imgUrl) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 120000);
    try {
      const res = await fetch(settings.img2imgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: referenceImage,
          imageUrl: referenceImage,
          prompt: fullPrompt,
          seed,
          strength: 0.35,
          adultMode,
          sourceType: "fictional",
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Reference image provider HTTP ${res.status}`);
      const type = res.headers.get("content-type") || "";
      if (type.startsWith("image/")) {
        const blob = await res.blob();
        if (!blob.size) throw new Error("Image provider returned an empty file");
        const reader = new FileReader();
        const url = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Could not decode generated image"));
          reader.readAsDataURL(blob);
        });
        return { imageUrl: url, engine: "Configured reference image model" };
      }
      const response = (await res.json()) as {
        imageUrl?: string;
        url?: string;
        image?: string;
        error?: string;
      };
      const url = response.imageUrl || response.url || response.image;
      if (!url || !/^(https?:\/\/|data:image\/)/i.test(url)) {
        throw new Error(response.error || "Reference model returned no valid image URL");
      }
      return { imageUrl: url, engine: "Configured reference image model" };
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Reference provider unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  if (settings.localImageBase && (settings.localImageMode === "comfy" || settings.localImageMode === "forge")) {
    const local = await generateLocalImage({
      prompt: fullPrompt,
      seed,
      width: 768,
      height: 1152,
      referenceImageBase64: referenceImage,
    });
    if (!local.ok || !local.imageUrl) {
      throw new Error(local.note || "The configured local reference-image backend did not generate an image.");
    }
    return { imageUrl: local.imageUrl, engine: local.note };
  }

  throw new Error(
    "No reference-aware image model configured. In Advanced Media set an img2img endpoint, use A1111 / Forge with --api, or configure compatible ComfyUI reference-image nodes.",
  );
}
