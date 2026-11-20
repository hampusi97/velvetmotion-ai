/** Lightweight JARVIS-inspired in-call controls.
 * These are the only supported actions; speech transcripts never execute OS commands.
 */
export type VoiceAction = "end-call" | "pause-listening" | "resume-listening" | null;

export function detectVoiceAction(transcript: string): VoiceAction {
  const text = transcript.trim().toLocaleLowerCase().replace(/[.!?,]+$/g, "");
  if (/^(?:jarvis[, ]+)?(?:end (?:the )?call|hang up|goodbye jarvis)$/.test(text)) return "end-call";
  if (/^(?:jarvis[, ]+)?(?:stop listening|mute microphone|pause listening)$/.test(text)) return "pause-listening";
  if (/^(?:jarvis[, ]+)?(?:resume listening|unmute microphone|start listening)$/.test(text)) return "resume-listening";
  return null;
}
