"use client";

import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX } from "lucide-react";

export type VibeMode = "off" | "rain" | "lofi" | "bass";

const MODES: Array<{ id: VibeMode; label: string }> = [
  { id: "off", label: "Off" },
  { id: "rain", label: "Midnight Rain" },
  { id: "lofi", label: "Neon Lo-Fi" },
  { id: "bass", label: "Rooftop Bass" },
];

export function AmbientMixer({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<VibeMode>("off");
  const [volume, setVolume] = useState(0.35);
  const [open, setOpen] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const stopNodesRef = useRef<Array<() => void>>([]);

  const stopAll = () => {
    for (const stop of stopNodesRef.current) {
      try {
        stop();
      } catch {
        /* ignore */
      }
    }
    stopNodesRef.current = [];
  };

  useEffect(() => {
    const onBossMute = () => {
      stopAll();
      setMode("off");
    };
    window.addEventListener("vm:boss-key-mute", onBossMute);
    return () => {
      window.removeEventListener("vm:boss-key-mute", onBossMute);
      stopAll();
    };
  }, []);

  useEffect(() => {
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volume * 0.25, ctxRef.current.currentTime, 0.05);
    }
  }, [volume]);

  const startMode = (nextMode: VibeMode) => {
    stopAll();
    setMode(nextMode);
    if (nextMode === "off" || typeof window === "undefined") return;

    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});

    const master = ctx.createGain();
    master.gain.value = volume * 0.25;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    if (nextMode === "rain") {
      // Filtered brown/pink procedural rain buffer
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.04 * white) / 1.04;
        lastOut = data[i];
        data[i] *= 2.8;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 950;
      filter.Q.value = 0.7;
      noise.connect(filter);
      filter.connect(master);
      noise.start();
      stopNodesRef.current.push(() => noise.stop());
      return;
    }

    if (nextMode === "lofi") {
      // Lush detuned ambient synth pad (Cmin9 chord glow)
      const freqs = [130.81, 155.56, 196.0, 293.66];
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 620;
      filter.connect(master);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.16;
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      stopNodesRef.current.push(() => lfo.stop());

      for (const f of freqs) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = f;
        g.gain.value = 0.16;
        osc.connect(g);
        g.connect(filter);
        osc.start();
        stopNodesRef.current.push(() => osc.stop());
      }
      return;
    }

    if (nextMode === "bass") {
      // Deep muted rooftop bass pulse
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 55;
      const pulseGain = ctx.createGain();
      pulseGain.gain.value = 0.55;
      const lfo = ctx.createOscillator();
      const lfoDepth = ctx.createGain();
      lfo.frequency.value = 1.6;
      lfoDepth.gain.value = 0.35;
      lfo.connect(lfoDepth);
      lfoDepth.connect(pulseGain.gain);
      osc.connect(pulseGain);
      pulseGain.connect(master);
      osc.start();
      lfo.start();
      stopNodesRef.current.push(() => {
        osc.stop();
        lfo.stop();
      });
    }
  };

  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ambient Vibe Mixer"
        className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition ${
          mode !== "off"
            ? "border-[#00f5ff]/55 bg-[#00f5ff]/15 text-[#00f5ff]"
            : "border-white/15 text-zinc-300 hover:border-[#ff1e8e]/50"
        }`}
      >
        <Music2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{mode === "off" ? "Vibe" : MODES.find((m) => m.id === mode)?.label}</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#00f5ff]/35 bg-[#090914]/95 p-2.5 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold text-[#00f5ff] flex items-center gap-1.5">
          <Music2 className="h-3.5 w-3.5" /> Ambient Vibe Mixer
        </span>
        {compact && (
          <button type="button" onClick={() => setOpen(false)} className="text-[10px] text-[#a6a6c4] hover:text-white">
            Hide
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => startMode(m.id)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition ${
              mode === m.id
                ? "border-[#ff1e8e] bg-[#ff1e8e]/20 text-white"
                : "border-white/10 text-[#a6a6c4] hover:border-white/25"
            }`}
          >
            {m.id === "off" && <VolumeX className="inline h-3 w-3 mr-0.5" />}
            {m.label}
          </button>
        ))}
      </div>
      {mode !== "off" && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[10px] text-[#a6a6c4]">Vol</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="flex-1 accent-[#00f5ff] h-1.5 cursor-pointer"
          />
          <span className="text-[10px] text-[#00f5ff] tabular-nums w-8 text-right">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
