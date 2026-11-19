/**
 * Synthesized Neon UI Sound Effects (zero dependencies, 100% Web Audio API).
 * Respects `vm-ui-sound` user toggle and `vm:boss-key-mute`.
 */

const SOUND_KEY = "vm-ui-sound";

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!isUiSoundEnabled()) return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

if (typeof window !== "undefined") {
  window.addEventListener("vm:boss-key-mute", () => {
    try {
      void audioCtx?.suspend();
    } catch {
      /* ignore */
    }
  });
}

export function isUiSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SOUND_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setUiSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_KEY, String(enabled));
    window.dispatchEvent(new Event("vm:ui-sound-changed"));
  } catch {
    /* ignore */
  }
}

function playTone(freq: number, endFreq: number, durationSec: number, type: OscillatorType, gainPeak = 0.06, delaySec = 0) {
  const c = ctx();
  if (!c) return;
  try {
    const start = c.currentTime + delaySec;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + durationSec);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + durationSec + 0.02);
  } catch {
    /* ignore autoplay lock */
  }
}

/** Crisp glass swipe tick */
export function playSwipeTick(liked = true) {
  playTone(liked ? 620 : 340, liked ? 880 : 210, 0.08, "sine", 0.05);
}

/** Cyber electric zap for Super-Like */
export function playSuperLikeZap() {
  playTone(540, 1480, 0.14, "triangle", 0.07, 0);
  playTone(880, 1760, 0.16, "sine", 0.05, 0.06);
}

/** Dual neon chime when Match triggers */
export function playMatchChime() {
  playTone(523.25, 523.25, 0.18, "sine", 0.06, 0);
  playTone(659.25, 659.25, 0.2, "sine", 0.06, 0.09);
  playTone(783.99, 1046.5, 0.28, "triangle", 0.05, 0.18);
}

/** Ascending neon synth swell on Level-Up or Milestone */
export function playLevelUpSwell() {
  playTone(392, 587.33, 0.22, "triangle", 0.06, 0);
  playTone(587.33, 783.99, 0.26, "sine", 0.06, 0.12);
  playTone(783.99, 1174.66, 0.35, "sine", 0.05, 0.24);
}
