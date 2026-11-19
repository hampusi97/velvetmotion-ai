import type { CharacterVoice } from "@/lib/charactersTypes";
import { playCountdownChime } from "@/lib/audioEngine";

export type JoiVoiceTrack = {
  id: string;
  label: string;
  badge: string;
  bpm: number;
  lines: string[];
};

export const JOI_DIRTY_TRACKS: JoiVoiceTrack[] = [
  {
    id: "whisper-tease",
    label: "Whispered Tease & Lube",
    badge: "Warm-up · 65 BPM",
    bpm: 65,
    lines: [
      "Mmm… get comfortable and put your hand around yourself nice and slow.",
      "Just the tip first. Let me hear you breathe while you take your time.",
      "Don't rush. Every slow stroke makes you ache harder for what comes next.",
    ],
  },
  {
    id: "edge-control",
    label: "Breathless Edge & Hold",
    badge: "Edging · 105 BPM",
    bpm: 105,
    lines: [
      "Pick up the pace now… match the beat. Tighter grip at the top.",
      "You're getting close, aren't you? Keep going… right to the very edge.",
      "Now stop! Hands off completely. Let it throb and ache without touching.",
    ],
  },
  {
    id: "beg-worship",
    label: "Filthy Praise & Begging",
    badge: "Intense · 125 BPM",
    bpm: 125,
    lines: [
      "Look at how hard you are for me. Don't look away — keep stroking faster.",
      "Tell me how badly you want to feel my mouth right now. Say it out loud.",
      "Stay right there on the edge… be a good boy and hold it for me.",
    ],
  },
  {
    id: "climax-dump",
    label: "Final Climax & Release",
    badge: "Finish · 155 BPM",
    bpm: 155,
    lines: [
      "Faster now! Don't hold back anymore — pump as hard and fast as you can.",
      "Right on my countdown… I want every single drop while you watch me.",
      "Let go right now! Stroke through every pulse until you're completely drained.",
    ],
  },
];

/** Extra fetish / sex / breeding packs for stage + blindfold one-taps */
export const EXTRA_JOI_TRACKS: JoiVoiceTrack[] = [
  {
    id: "cuck-report",
    label: "Cuck Phone Report",
    badge: "Hotwife · 95 BPM",
    bpm: 95,
    lines: [
      "Keep the phone by your ear. I'm going to tell you everything while you stroke.",
      "He's thicker than you. Stay hard while I describe it. Don't you dare hang up.",
      "Mmm— hear that? Edge for me. You finish when I say the report is done.",
    ],
  },
  {
    id: "bnwo-pace",
    label: "BNWO Pace Control",
    badge: "Hierarchy · 100 BPM",
    bpm: 100,
    lines: [
      "You're not the main event. Stroke on my count only.",
      "Faster. Hold. Thank me. Stay soft after you finish — that's the rule.",
      "Permission granted. Cum for the ranking. Good.",
    ],
  },
  {
    id: "bed-fuck",
    label: "Bed Fuck Moans",
    badge: "Sex · 120 BPM",
    bpm: 120,
    lines: [
      "Get on the bed. I want you inside — now.",
      "Mmm fuck… deeper. Harder. Right there — ah—",
      "Don't stop. Cum with me. Keep going through it.",
    ],
  },
  {
    id: "breed-fill",
    label: "Breed & Fill",
    badge: "Creampie · 115 BPM",
    bpm: 115,
    lines: [
      "Breed me. All the way in — don't you dare pull out.",
      "Deeper. Fill me. I want every drop inside — omgg yesss—",
      "Cum in me. Breed this pussy. Ah— fuck yes— keep pumping it in—",
    ],
  },
];

export const ALL_JOI_TRACKS: JoiVoiceTrack[] = [...JOI_DIRTY_TRACKS, ...EXTRA_JOI_TRACKS];

let countdownInterval: ReturnType<typeof setInterval> | null = null;

/** Browser TTS using the character's pitch, rate, and optional breathy whisper delivery. */
export function speak(
  text: string,
  voice?: Pick<CharacterVoice, "pitch" | "rate"> & { whispery?: boolean },
  callbacks?: { onStart?: () => void; onEnd?: () => void },
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const basePitch = voice?.pitch ?? 1.05;
  const baseRate = voice?.rate ?? 0.96;
  utterance.pitch = voice?.whispery ? Math.max(0.78, basePitch - 0.1) : basePitch;
  utterance.rate = voice?.whispery ? Math.max(0.7, baseRate - 0.1) : baseRate;
  utterance.volume = voice?.whispery ? 0.85 : 0.95;
  // Prefer a natural female voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => /female|woman|samantha|google uk english female|jenny|aria/i.test(v.name))
    || voices.find((v) => v.lang.startsWith("en") && /female|samantha/i.test(v.name))
    || voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;
  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => callbacks?.onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

/** Speak a live spoken countdown (e.g. 10 -> 1 -> Finish!) synchronized with chimes. */
export function startVoiceCountdown(
  seconds: number,
  options?: {
    voice?: Pick<CharacterVoice, "pitch" | "rate">;
    finishPhrase?: string;
    onTick?: (remaining: number) => void;
    onComplete?: () => void;
  },
) {
  stopSpeaking();
  let remaining = Math.max(3, Math.min(30, Math.floor(seconds)));
  options?.onTick?.(remaining);

  const speakNumber = (n: number) => {
    playCountdownChime(n === 0);
    if (n === 0) {
      speak(options?.finishPhrase || "Cum for me right now. Don't hold back.", {
        pitch: options?.voice?.pitch ?? 1.02,
        rate: options?.voice?.rate ?? 0.9,
        whispery: true,
      });
      return;
    }
    if (n <= 5 || n % 5 === 0) {
      const cue =
        n === 10
          ? "Ten seconds. Faster."
          : n === 5
            ? "Five… stay right on the edge."
            : n === 3
              ? "Three… almost there."
              : `${n}`;
      speak(cue, {
        pitch: options?.voice?.pitch ?? 1.0,
        rate: 1.05,
      });
    }
  };

  speakNumber(remaining);

  countdownInterval = setInterval(() => {
    remaining -= 1;
    options?.onTick?.(remaining);
    if (remaining <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      speakNumber(0);
      options?.onComplete?.();
    } else {
      speakNumber(remaining);
    }
  }, 1000);
}
