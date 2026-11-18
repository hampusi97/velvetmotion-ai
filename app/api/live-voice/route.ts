import { NextResponse } from "next/server";
import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";
import { buildSystemPrompt, fallbackReply, getCharacter } from "@/lib/characters";
import { computeMoodState, type MoodState } from "@/lib/moodEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function keyIsReal(key: string) {
  return key.length > 15 && !/dummy|your_|changeme|placeholder/i.test(key);
}

/** Wrap raw 24kHz 16-bit mono PCM bytes into a playable WAV data URL */
function pcm24kToWavDataUrl(pcmBuffer: Buffer): string {
  const sampleRate = 24000;
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  header.writeUInt16LE(numChannels * bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  const wav = Buffer.concat([header, pcmBuffer]);
  return `data:audio/wav;base64,${wav.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const characterId = typeof body.characterId === "string" ? body.characterId : "";
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const audioPcmBase64 = typeof body.audioPcmBase64 === "string" ? body.audioPcmBase64 : "";
    const romanceMode = Boolean(body.romanceMode);
    const intimacy = typeof body.intimacy === "number" ? body.intimacy : 60;
    const durationSeconds = typeof body.durationSeconds === "number" ? body.durationSeconds : 30;
    const voiceName =
      typeof body.voiceName === "string" &&
      ["Zephyr", "Kore", "Puck", "Charon", "Fenrir"].includes(body.voiceName)
        ? body.voiceName
        : "Kore";

    const character = getCharacter(characterId);
    const activeMood: MoodState | undefined = character
      ? computeMoodState({
          character,
          messages: [{ role: "user", content: transcript || "Speak to me." }],
          durationSeconds,
          intimacy,
          romanceMode,
        })
      : undefined;

    const systemInstruction = character
      ? `${buildSystemPrompt(character, romanceMode, activeMood)}\nYou are speaking aloud in a live intimate voice call. Keep your spoken response natural, breathy, and 1 to 3 sentences.`
      : "You are a warm, sultry adult companion speaking in a live voice call.";

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (keyIsReal(apiKey)) {
      const ai = new GoogleGenAI({ apiKey });

      // Attempt Live API session (`gemini-3.8-live`) for real-time audio output
      try {
        const result = await new Promise<{ audioUrl?: string; textReply?: string } | null>(
          async (resolve) => {
            const chunks: Buffer[] = [];
            let textOut = "";
            let settled = false;
            const finish = (val: { audioUrl?: string; textReply?: string } | null) => {
              if (!settled) {
                settled = true;
                resolve(val);
              }
            };

            const timer = setTimeout(() => {
              if (chunks.length > 0 || textOut) {
                finish({
                  audioUrl: chunks.length > 0 ? pcm24kToWavDataUrl(Buffer.concat(chunks)) : undefined,
                  textReply: textOut || undefined,
                });
              } else {
                finish(null);
              }
            }, 6500);

            try {
              const session = await ai.live.connect({
                model: "gemini-3.8-live",
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                  },
                  outputAudioTranscription: {},
                  systemInstruction,
                },
                callbacks: {
                  onmessage: (message: LiveServerMessage) => {
                    const partData =
                      message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (partData) {
                      chunks.push(Buffer.from(partData, "base64"));
                    }
                    const trans = (
                      message.serverContent as { outputTranscription?: { text?: string } } | undefined
                    )?.outputTranscription?.text;
                    if (trans) textOut += trans;
                    if (message.serverContent?.turnComplete) {
                      clearTimeout(timer);
                      try {
                        session.close();
                      } catch {
                        /* ignore */
                      }
                      finish({
                        audioUrl:
                          chunks.length > 0 ? pcm24kToWavDataUrl(Buffer.concat(chunks)) : undefined,
                        textReply: textOut.trim() || undefined,
                      });
                    }
                  },
                  onerror: () => {
                    clearTimeout(timer);
                    finish(null);
                  },
                },
              });

              if (audioPcmBase64) {
                session.sendRealtimeInput({
                  audio: { data: audioPcmBase64, mimeType: "audio/pcm;rate=16000" },
                });
              } else {
                session.sendRealtimeInput({
                  text: transcript || "Say something seductive and intimate to me right now.",
                });
              }
            } catch {
              clearTimeout(timer);
              finish(null);
            }
          },
        );

        if (result && (result.audioUrl || result.textReply)) {
          const fallbackText = character
            ? fallbackReply(character, transcript || "Hello", romanceMode, activeMood)
            : "I love hearing your voice.";
          return NextResponse.json({
            success: true,
            reply: result.textReply || fallbackText,
            audioUrl: result.audioUrl,
            mood: activeMood?.mood,
            modelUsed: "gemini-3.8-live",
          });
        }
      } catch {
        /* fall through to text + speech synthesis */
      }
    }

    const fallbackText = character
      ? fallbackReply(character, transcript || "Talk to me closely", romanceMode, activeMood)
      : "Come closer… I have been waiting to hear your voice.";

    return NextResponse.json({
      success: true,
      reply: fallbackText,
      mood: activeMood?.mood,
      modelUsed: "gemini-3.8-live-fallback",
    });
  } catch {
    return NextResponse.json({ error: "Invalid voice request." }, { status: 400 });
  }
}
