/**
 * Neural Voice Synthesis Adapter
 * Supports persisted Voice Engine selection across:
 *   - Fish Audio Drama 3 (127.0.0.1:5002 local audio.cpp)
 *   - Kokoro-82M (127.0.0.1:8880 / Web fallback)
 *   - Kitten-TTS-2 Pico / Reverb-TTS WebGPU profiles
 *   - Instant OS Web Speech API fallback (zero silent failures)
 * Respects `vm:boss-key-mute` so Boss Key silences playback instantaneously.
 */
import type { VoiceEngineOption } from "@/data/localModelCatalog";

export type VoiceEngineId = VoiceEngineOption["id"];

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

const VOICE_ENGINE_KEY = "vm-voice-engine";

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

export function getPreferredVoiceEngine(): VoiceEngineId {
  if (typeof window === "undefined") return "kokoro-82m";
  try {
    const saved = localStorage.getItem(VOICE_ENGINE_KEY) as VoiceEngineId | null;
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return "kokoro-82m";
}

export function setPreferredVoiceEngine(id: VoiceEngineId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOICE_ENGINE_KEY, id);
    window.dispatchEvent(new CustomEvent("vm:voice-engine-changed", { detail: id }));
  } catch {
    /* ignore */
  }
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

async function tryLocalTtsEndpoint(
  endpoint: string,
  model: string,
  text: string,
  voiceId: string,
): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 950);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: text,
        voice: voiceId,
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
      return true;
    }
  } catch {
    /* Fall back smoothly */
  }
  return false;
}

export async function speakWithNeuralVoice(
  text: string,
  opts: { voiceId?: string; whispery?: boolean; pitch?: number; rate?: number; engineOverride?: VoiceEngineId } = {},
): Promise<{ engine: "fish-drama-3" | "kokoro" | "reverb-webgpu" | "kitten-pico" | "webspeech" | "none"; label: string }> {
  const clean = text.replace(/\*[^*]+\*/g, "").replace(/\s+/g, " ").trim().slice(0, 420);
  if (!clean || typeof window === "undefined") return { engine: "none", label: "Muted" };
  stopNeuralSpeech();

  const selected = opts.engineOverride || getPreferredVoiceEngine();

  // 1. Fish Audio Drama 3 on local audio.cpp (:5002) when chosen
  if (selected === "fish-drama-3-local") {
    const okFish = await tryLocalTtsEndpoint(
      "http://127.0.0.1:5002/v1/audio/speech",
      "fish-drama-3",
      clean,
      opts.voiceId || "af_heart",
    );
    if (okFish) return { engine: "fish-drama-3", label: "Fish Drama 3 Local" };
  }

  // 2. Local Kokoro-82M / OpenAI-compatible TTS server (:8880) unless pure OS fallback requested
  if (selected !== "browser-speech") {
    const okKokoro = await tryLocalTtsEndpoint(
      "http://127.0.0.1:8880/v1/audio/speech",
      selected === "reverb-tts-webgpu" ? "reverb" : selected === "kitten-tts-2-pico" ? "kitten-2" : "kokoro",
      clean,
      opts.voiceId || "af_heart",
    );
    if (okKokoro) {
      if (selected === "reverb-tts-webgpu") return { engine: "reverb-webgpu", label: "Reverb-TTS WebGPU" };
      if (selected === "kitten-tts-2-pico") return { engine: "kitten-pico", label: "Kitten-TTS-2 Pico" };
      return { engine: "kokoro", label: "Kokoro-82M Neural" };
    }
  }

  // 3. Guaranteed Web Speech API fallback (tuned cleanly per selected voice engine mood)
  if ("speechSynthesis" in window) {
    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(clean);
        const preset = VOICE_TUNING[(opts.voiceId as KokoroVoiceId) || "af_heart"] || VOICE_TUNING.af_heart;
        const speedBias = selected === "kitten-tts-2-pico" ? 1.03 : selected === "reverb-tts-webgpu" ? 0.98 : 1.0;
        u.pitch = opts.pitch ?? (opts.whispery ? Math.max(0.75, preset.pitch - 0.12) : preset.pitch);
        u.rate = (opts.rate ?? (opts.whispery ? Math.max(0.76, preset.rate - 0.1) : preset.rate)) * speedBias;
        const voices = window.speechSynthesis.getVoices();
        const fem = voices.find((v) => /female|samantha|karen|victoria|ava|zoe|emma|serena|en-us|en-gb/i.test(v.name));
        if (fem) u.voice = fem;
        const fallbackLabel =
          selected === "reverb-tts-webgpu"
            ? "Reverb Fallback HD"
            : selected === "kitten-tts-2-pico"
              ? "Kitten-2 Fallback HD"
              : selected === "fish-drama-3-local"
                ? "Drama Fallback HD"
                : "Kokoro / WebSpeech HD";
        u.onend = () => resolve({ engine: "webspeech", label: fallbackLabel });
        u.onerror = () => resolve({ engine: "webspeech", label: fallbackLabel });
        window.speechSynthesis.speak(u);
      } catch {
        resolve({ engine: "none", label: "Unavailable" });
      }
    });
  }

  return { engine: "none", label: "Unavailable" };
}
