"use client";

import { useEffect, useRef } from "react";
import type { SpeechPrefs } from "@/components/use-speech";

export function VoicePanel({
  open,
  name,
  hint,
  supported,
  voices,
  prefs,
  onChange,
  onPreview,
  onClose,
}: {
  open: boolean;
  name: string;
  hint: string;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  prefs: SpeechPrefs;
  onChange: (prefs: SpeechPrefs) => void;
  onPreview: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const known = voices.some((voice) => voice.voiceURI === prefs.voiceURI);

  return (
    <dialog ref={dialogRef} className="sheet" aria-labelledby="voice-title" onClose={onClose}>
      <form method="dialog" className="sheet-card" onSubmit={onClose}>
        <p className="eyebrow">This device only</p>
        <h2 id="voice-title" className="font-display text-3xl text-rose-50">
          {name}&apos;s voice
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-rose-100/70">
          Written voice: {hint}. Playback uses the Web Speech API and the voices already installed on this device. Nothing is uploaded, and no real person&apos;s voice is cloned.
        </p>
        {!supported && (
          <p className="mt-4 rounded-2xl border border-amber-200/30 bg-amber-200/10 px-4 py-3 text-sm text-amber-50" role="status">
            This browser doesn&apos;t offer speech synthesis. You can still read every message.
          </p>
        )}
        {supported && voices.length === 0 && (
          <p className="mt-4 text-sm text-rose-100/70" role="status">
            No named system voices have been reported yet. Playback will use the browser default.
          </p>
        )}
        <label className="mt-5 block text-sm" htmlFor="voice-select">
          System voice
          <select
            id="voice-select"
            className="field mt-2"
            value={prefs.voiceURI}
            disabled={!supported}
            onChange={(event) => onChange({ ...prefs, voiceURI: event.target.value })}
          >
            <option value="">System default</option>
            {!known && prefs.voiceURI && <option value={prefs.voiceURI}>Saved voice unavailable here</option>}
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm" htmlFor="voice-pitch">
          Pitch <span className="text-rose-100/60">{prefs.pitch.toFixed(2)}</span>
          <input
            id="voice-pitch"
            className="mt-2 w-full"
            type="range"
            min="0.5"
            max="1.8"
            step="0.05"
            value={prefs.pitch}
            onChange={(event) => onChange({ ...prefs, pitch: Number(event.target.value) })}
          />
        </label>
        <label className="mt-4 block text-sm" htmlFor="voice-rate">
          Rate <span className="text-rose-100/60">{prefs.rate.toFixed(2)}</span>
          <input
            id="voice-rate"
            className="mt-2 w-full"
            type="range"
            min="0.7"
            max="1.4"
            step="0.05"
            value={prefs.rate}
            onChange={(event) => onChange({ ...prefs, rate: Number(event.target.value) })}
          />
        </label>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="button-primary" onClick={onPreview} disabled={!supported}>
            Preview
          </button>
          <button type="submit" className="button-quiet">
            Done
          </button>
        </div>
      </form>
    </dialog>
  );
}
