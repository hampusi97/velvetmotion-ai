/**
 * Neural Voice Synthesis Adapter (Kokoro-82M + instant Web Speech API fallback)
 * Respects `vm:boss-key-mute` so Boss Key silences playback instantaneously.
 */

export type KokoroVoiceId =
  | "af_heart"
  | "af_bella"
  | "af_nicole"
  | "af_sky"
  | "af_sarah"
  | "bf_emma";

interface VoiceProfile {
  pitch: number;
  rate: number;
}

const VOICE_TUNING: Record<KokoroVoiceId, VoiceProfile> = {
  af_heart: { pitch: 1.06, rate: 0.96 },
  af_bella: { pitch: 1.12, rate: 1.02 },
  af_nicole: { pitch: 0.94, rate: 0.89 },
  af_sky: { pitch: 1.15, rate: 1.0 },
  af_sarah: { pitch: 1.0, rate: 0.94 },
  bf_emma: { pitch: 0.9, rate: 0.91 },
};

let activeAudio: HTMLAudioElement | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("vm:boss-key-mute", () => {
    stopNeuralSpeech();
  });
}

export function stopNeuralSpeech() {
  try {
    activeAudio?.pause();
    activeAudio = null;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export async function speakWithNeuralVoice(
  text: string,
  opts: { voiceId?: string; whispery?: boolean; pitch?: number; rate?: number } = {},
): Promise<{ engine: "kokoro" | "webspeech" | "none" }> {
  const clean = text.replace(/\*[^*]+\*/g, "").replace(/\s+/g, " ").trim().slice(0, 420);
  if (!clean || typeof window === "undefined") return { engine: "none" };
  stopNeuralSpeech();

  // Optional local Kokoro / OpenAI-compatible TTS server when Desktop Local Ultra runs on port 8880
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 900);
    const res = await fetch("http://127.0.0.1:8880/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "kokoro",
        input: clean,
        voice: opts.voiceId || "af_heart",
        response_format: "mp3",
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudio = audio;
      await audio.play().catch(() => undefined);
      return { engine: "kokoro" };
    }
  } catch {
    /* Fall back smoothly to Web Speech API */
  }

  if ("speechSynthesis" in window) {
    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(clean);
        const preset = VOICE_TUNING[(opts.voiceId as KokoroVoiceId) || "af_heart"] || VOICE_TUNING.af_heart;
        u.pitch = opts.pitch ?? (opts.whispery ? Math.max(0.75, preset.pitch - 0.12) : preset.pitch);
        u.rate = opts.rate ?? (opts.whispery ? Math.max(0.76, preset.rate - 0.1) : preset.rate);
        const voices = window.speechSynthesis.getVoices();
        const fem = voices.find((v) => /female|samantha|karen|victoria|ava|zoe|emma|serena|en-us|en-gb/i.test(v.name));
        if (fem) u.voice = fem;
        u.onend = () => resolve({ engine: "webspeech" });
        u.onerror = () => resolve({ engine: "webspeech" });
        window.speechSynthesis.speak(u);
      } catch {
        resolve({ engine: "none" });
      }
    });
  }

  return { engine: "none" };
}
