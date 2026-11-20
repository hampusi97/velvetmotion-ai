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

export const FEMALE_KOKORO_VOICES = [
  "af_heart",
  "af_bella",
  "af_nova",
  "af_sarah",
  "af_sky",
  "bf_emma",
] as const;

export type KokoroVoiceId = (typeof FEMALE_KOKORO_VOICES)[number];

interface VoiceProfile {
  pitch: number;
  rate: number;
}

const VOICE_ENGINE_KEY = "vm-voice-engine";

const VOICE_TUNING: Record<KokoroVoiceId, VoiceProfile> = {
  af_heart: { pitch: 1.08, rate: 0.96 },
  af_bella: { pitch: 1.12, rate: 1.02 },
  af_nova: { pitch: 1.08, rate: 0.95 },
  af_sky: { pitch: 1.14, rate: 1.0 },
  af_sarah: { pitch: 1.04, rate: 0.94 },
  bf_emma: { pitch: 1.04, rate: 0.92 },
};

const MALE_VOICE_EXCLUSION_RX =
  /\b(david|mark|george|daniel|alex|guy|ryan|richard|paul|james|john|william|thomas|christopher|andrew|matthew|male)\b/i;

const FEMALE_PRIORITY_PATTERNS: RegExp[] = [
  /\bjenny\b/i,
  /\baria\b/i,
  /\bzira\b/i,
  /\bsonia\b/i,
  /\bemma\b/i,
  /\bsamantha\b/i,
  /\bvictoria\b/i,
  /google us english/i,
  /\bnatural\b/i,
  /female|woman|karen|ava|zoe|serena|kate|tessa|moira|libby|maisie/i,
];

/** Strictly maps any companion voice ID to one of the 6 female Kokoro voices. */
export function normalizeFemaleKokoroVoice(voiceId?: string): KokoroVoiceId {
  const normalized = (voiceId || "").trim().toLowerCase();
  if ((FEMALE_KOKORO_VOICES as readonly string[]).includes(normalized)) {
    return normalized as KokoroVoiceId;
  }
  if (normalized === "af_nicole") return "af_nova";
  if (normalized.startsWith("bf_")) return "bf_emma";
  return "af_heart";
}

/** Strips emojis, *action* asterisks, and bracketed [Image of ...] / [Photo of ...] tags before TTS. */
export function cleanSpeechText(raw: string): string {
  return raw
    .replace(/\[(?:image|photo|selfie)\b[^\]]*\]/gi, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\*[^*]+\*/g, " ")
    .replace(/\*/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\uFE0F\u200D]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Selects the best female English Web Speech voice and excludes male system voices. */
export function selectFemaleEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (!Array.isArray(voices) || voices.length === 0) return undefined;
  const nonMale = voices.filter((v) => !MALE_VOICE_EXCLUSION_RX.test(v.name || ""));
  const englishNonMale = nonMale.filter((v) => /^en\b/i.test(v.lang || ""));
  const pool = englishNonMale.length > 0 ? englishNonMale : nonMale;

  for (const pattern of FEMALE_PRIORITY_PATTERNS) {
    const match = pool.find((v) => pattern.test(v.name || ""));
    if (match) return match;
  }
  return englishNonMale[0];
}

/** Waits for speechSynthesis `onvoiceschanged` when voices are not loaded immediately. */
export function loadWebSpeechVoices(timeoutMs = 700): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  const initial = window.speechSynthesis.getVoices();
  if (initial.length > 0) return Promise.resolve(initial);

  return new Promise((resolve) => {
    let settled = false;
    const synth = window.speechSynthesis;
    const prevHandler = synth.onvoiceschanged;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (synth.onvoiceschanged === onChanged) {
        synth.onvoiceschanged = prevHandler ?? null;
      }
      resolve(synth.getVoices());
    };
    const onChanged = (ev: Event) => {
      if (typeof prevHandler === "function") prevHandler.call(synth, ev);
      if (synth.getVoices().length > 0) finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.onvoiceschanged = onChanged;
  });
}

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeAudioDone: (() => void) | null = null;
let activeSpeechRequest: AbortController | null = null;
let speechGeneration = 0;

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
  speechGeneration += 1;
  activeSpeechRequest?.abort();
  activeSpeechRequest = null;
  activeAudioDone?.();
  activeAudioDone = null;
  try {
    activeAudio?.pause();
  } catch {
    /* ignore */
  }
  activeAudio = null;
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
  activeAudioUrl = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Wait for actual neural audio playback to complete before reporting success.
 * Returning true when an HTTP response is received (or audio.play rejects)
 * makes hands-free calls listen over the companion's voice.
 */
async function tryLocalTtsEndpoint(
  endpoint: string,
  model: string,
  text: string,
  voiceId: string,
  generation: number,
): Promise<boolean> {
  const ctrl = new AbortController();
  activeSpeechRequest = ctrl;
  const timeout = setTimeout(() => ctrl.abort(), 20000);
  try {
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
    if (!res.ok || speechGeneration !== generation) return false;
    const blob = await res.blob();
    if (blob.size < 512 || speechGeneration !== generation) return false;

    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    activeAudio = audio;
    activeAudioUrl = objectUrl;
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (played: boolean) => {
        if (settled) return;
        settled = true;
        if (activeAudioDone === cancelPlayback) activeAudioDone = null;
        if (activeAudio === audio) activeAudio = null;
        if (activeAudioUrl === objectUrl) activeAudioUrl = null;
        URL.revokeObjectURL(objectUrl);
        resolve(played && speechGeneration === generation);
      };
      const cancelPlayback = () => finish(false);
      activeAudioDone = cancelPlayback;
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      void audio.play().catch(() => finish(false));
    });
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    if (activeSpeechRequest === ctrl) activeSpeechRequest = null;
  }
}

export async function speakWithNeuralVoice(
  text: string,
  opts: { voiceId?: string; whispery?: boolean; pitch?: number; rate?: number; engineOverride?: VoiceEngineId } = {},
): Promise<{ engine: "fish-drama-3" | "kokoro" | "reverb-webgpu" | "kitten-pico" | "webspeech" | "none"; label: string }> {
  const clean = cleanSpeechText(text).slice(0, 420);
  if (!clean || typeof window === "undefined") return { engine: "none", label: "Muted" };
  stopNeuralSpeech();
  const generation = speechGeneration;

  const selected = opts.engineOverride || getPreferredVoiceEngine();
  const femaleKokoroVoice = normalizeFemaleKokoroVoice(opts.voiceId);

  // 1. Fish Audio Drama 3 on local audio.cpp (:5002) when chosen
  if (selected === "fish-drama-3-local") {
    const okFish = await tryLocalTtsEndpoint(
      "http://127.0.0.1:5002/v1/audio/speech",
      "fish-drama-3",
      clean,
      femaleKokoroVoice,
      generation,
    );
    if (okFish) return { engine: "fish-drama-3", label: "Fish Drama 3 Local" };
  }

  // 2. Local Kokoro-82M / OpenAI-compatible TTS server (:8880) unless pure OS fallback requested
  if (selected !== "browser-speech") {
    const okKokoro = await tryLocalTtsEndpoint(
      "http://127.0.0.1:8880/v1/audio/speech",
      selected === "reverb-tts-webgpu" ? "reverb" : selected === "kitten-tts-2-pico" ? "kitten-2" : "kokoro",
      clean,
      femaleKokoroVoice,
      generation,
    );
    if (okKokoro) {
      if (selected === "reverb-tts-webgpu") return { engine: "reverb-webgpu", label: "Reverb-TTS WebGPU" };
      if (selected === "kitten-tts-2-pico") return { engine: "kitten-pico", label: "Kitten-TTS-2 Pico" };
      return { engine: "kokoro", label: "Kokoro-82M Neural" };
    }
  }

  // 3. Guaranteed Web Speech API fallback (strictly female voice, awaits onvoiceschanged)
  if (speechGeneration !== generation) return { engine: "none", label: "Stopped" };
  if ("speechSynthesis" in window) {
    const voices = await loadWebSpeechVoices();
    if (speechGeneration !== generation) return { engine: "none", label: "Stopped" };
    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(clean);
        const preset = VOICE_TUNING[femaleKokoroVoice] || VOICE_TUNING.af_heart;
        const speedBias = selected === "kitten-tts-2-pico" ? 1.03 : selected === "reverb-tts-webgpu" ? 0.98 : 1.0;
        u.pitch = opts.pitch ?? (opts.whispery ? Math.max(0.95, preset.pitch - 0.08) : 1.08);
        u.rate = (opts.rate ?? (opts.whispery ? Math.max(0.76, preset.rate - 0.1) : preset.rate)) * speedBias;
        const fem = selectFemaleEnglishVoice(voices);
        if (fem) u.voice = fem;
        u.onend = () => resolve({ engine: "webspeech", label: "Browser voice (fallback)" });
        u.onerror = () => resolve({ engine: "none", label: "Browser voice unavailable" });
        window.speechSynthesis.speak(u);
      } catch {
        resolve({ engine: "none", label: "Unavailable" });
      }
    });
  }

  return { engine: "none", label: "Unavailable" };
}
