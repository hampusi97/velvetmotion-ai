import type { CharacterVoice } from "@/lib/characters";

/** Browser TTS using the character's pitch and rate. No-ops without speechSynthesis. */
export function speak(text: string, voice?: Pick<CharacterVoice, "pitch" | "rate">) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = voice?.pitch ?? 1;
  utterance.rate = voice?.rate ?? 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
