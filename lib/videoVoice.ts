/**
 * Free video + voice for JOI / sex sequences.
 * Video = animated image sequence (works everywhere).
 * Voice = browser SpeechSynthesis (free, no key).
 * Optional: Pollinations video or local ComfyUI if configured.
 */

import { cleanSpeechText, loadWebSpeechVoices, selectFemaleEnglishVoice } from "@/lib/kokoroTts";

export type VideoFrame = { url: string; durationMs?: number };

export function buildJoiVideoSequence(frames: string[]): VideoFrame[] {
  return frames.map((url, i) => ({
    url,
    durationMs: i === frames.length - 1 ? 4000 : 2500,
  }));
}

export function buildSexVideoSequence(frames: string[]): VideoFrame[] {
  return frames.map((url, i) => ({
    url,
    durationMs: i === frames.length - 1 ? 5000 : 3000,
  }));
}

const JOI_SCRIPTS = [
  "Look at me. Keep your eyes on me. Don't you dare look away.",
  "That's it. Slow. I want to see you struggle.",
  "Faster. Don't stop. You're doing so well for me.",
  "Almost. Hold it. Don't finish until I say.",
  "Now. Come for me. All of it. Good boy.",
];

export function getJoiVoiceScript(step: number): string {
  return JOI_SCRIPTS[Math.min(step, JOI_SCRIPTS.length - 1)] || JOI_SCRIPTS[0];
}

export function speak(text: string, opts?: { rate?: number; pitch?: number; volume?: number }): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = cleanSpeechText(text);
  if (!clean) return;
  window.speechSynthesis.cancel();
  void loadWebSpeechVoices().then((voices) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = opts?.rate ?? 0.94;
    u.pitch = opts?.pitch ?? 1.08;
    u.volume = opts?.volume ?? 1;
    const female = selectFemaleEnglishVoice(voices);
    if (female) u.voice = female;
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeak(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function pollinationsVideoUrl(prompt: string, opts?: { duration?: number; seed?: number }): string {
  const key = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_POLLINATIONS_KEY) || "";
  const params = new URLSearchParams({
    model: "wan",
    duration: String(opts?.duration ?? 5),
    ...(opts?.seed != null ? { seed: String(opts.seed) } : {}),
    ...(key ? { key } : {}),
  });
  return `https://gen.pollinations.ai/video/${encodeURIComponent(prompt.slice(0, 800))}?${params}`;
}

export function localVideoEndpoint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("velvet-local-video-endpoint");
    return s || null;
  } catch {
    return null;
  }
}
