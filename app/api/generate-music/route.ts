import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type LyriaModel = "lyria-3-clip-preview" | "lyria-3-pro-preview";

function keyIsReal(key: string) {
  return key.length > 15 && !/dummy|your_|changeme|placeholder/i.test(key);
}

/** Synthesize a lush stereo ambient synth-pad WAV buffer (8 seconds, 22050Hz) as a guaranteed playable fallback. */
function synthesizeLoungeWavBase64(seedPrompt: string, durationSec = 8): string {
  const sampleRate = 22050;
  const numSamples = sampleRate * durationSec;
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV Header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Pick chord frequencies from prompt hash
  let h = 0;
  for (let i = 0; i < seedPrompt.length; i++) h = (h * 31 + seedPrompt.charCodeAt(i)) >>> 0;
  const rootSets = [
    [130.81, 164.81, 196.0, 246.94], // Cmaj7
    [146.83, 174.61, 220.0, 261.63], // Dm7
    [110.0, 130.81, 164.81, 196.0], // Am7
    [123.47, 155.56, 185.0, 233.08], // Bmaj7
  ];
  const chord = rootSets[h % rootSets.length];

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env =
      t < 0.8
        ? t / 0.8
        : t > durationSec - 1.2
          ? Math.max(0, (durationSec - t) / 1.2)
          : 1.0;
    const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.35 * t);
    const subPulse = Math.sin(2 * Math.PI * (chord[0] * 0.5) * t) * 0.25;

    let left = subPulse;
    let right = subPulse;
    for (let c = 0; c < chord.length; c++) {
      const freq = chord[c];
      const detune = (c - 1.5) * 0.45;
      left += Math.sin(2 * Math.PI * (freq - detune) * t) * 0.16;
      right += Math.sin(2 * Math.PI * (freq + detune) * t) * 0.16;
    }

    const sampleL = Math.max(-1, Math.min(1, left * env * lfo));
    const sampleR = Math.max(-1, Math.min(1, right * env * lfo));
    buffer.writeInt16LE(Math.floor(sampleL * 24000), offset);
    buffer.writeInt16LE(Math.floor(sampleR * 24000), offset + 2);
    offset += 4;
  }

  return buffer.toString("base64");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt =
      typeof body.prompt === "string" && body.prompt.trim()
        ? body.prompt.trim()
        : "Sensual midnight R&B lounge track with warm Rhodes chords, slow bassline, and velvet atmosphere";
    const model: LyriaModel =
      body.model === "lyria-3-pro-preview" ? "lyria-3-pro-preview" : "lyria-3-clip-preview";
    const referenceImageBase64 =
      typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : "";
    const referenceMimeType =
      typeof body.referenceMimeType === "string" ? body.referenceMimeType : "image/jpeg";

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (keyIsReal(apiKey)) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const cleanedImage = referenceImageBase64.replace(/^data:[^;]+;base64,/, "");

        const contents = cleanedImage
          ? {
              parts: [
                { text: prompt },
                { inlineData: { data: cleanedImage, mimeType: referenceMimeType } },
              ],
            }
          : prompt;

        const response = await ai.models.generateContentStream({
          model,
          contents,
        });

        let audioBase64 = "";
        let lyrics = "";
        let mimeType = "audio/wav";

        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
            if (part.text && !lyrics) {
              lyrics = part.text;
            }
          }
        }

        if (audioBase64) {
          return NextResponse.json({
            success: true,
            audioUrl: `data:${mimeType};base64,${audioBase64}`,
            lyrics: lyrics || "Instrumental penthouse soundtrack generated via Lyria 3.",
            modelUsed: model,
            promptUsed: prompt,
            source: model,
          });
        }
      } catch {
        /* fall back to synthesized ambient lounge WAV */
      }
    }

    const durationSec = model === "lyria-3-pro-preview" ? 12 : 8;
    const wavB64 = synthesizeLoungeWavBase64(prompt, durationSec);

    return NextResponse.json({
      success: true,
      audioUrl: `data:audio/wav;base64,${wavB64}`,
      lyrics: `♪ Penthouse Ambient Mix (${model === "lyria-3-pro-preview" ? "Extended Suite" : "30s Lounge Clip"}) · "${prompt}"`,
      modelUsed: model,
      promptUsed: prompt,
      source: "velvet-synth-engine",
      fallback: true,
    });
  } catch {
    return NextResponse.json({ error: "Invalid music generation request." }, { status: 400 });
  }
}
