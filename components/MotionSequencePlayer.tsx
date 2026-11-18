"use client";

import { useEffect, useState } from "react";
import { Play, Pause, Grid, Film } from "lucide-react";

const FRAME_LABELS = ["Opening", "Motion", "Climax", "Afterglow"];

export function MotionSequencePlayer({
  frames,
  fallbackSrc = "/avatars/maren.svg",
  compact = false,
}: {
  frames: string[];
  fallbackSrc?: string;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(true);
  const [frameIdx, setFrameIdx] = useState(0);
  const [fast, setFast] = useState(false);
  const [gridMode, setGridMode] = useState(false);

  useEffect(() => {
    if (!playing || gridMode || frames.length <= 1) return;
    const interval = setInterval(
      () => {
        setFrameIdx((idx) => (idx + 1) % frames.length);
      },
      fast ? 650 : 1250,
    );
    return () => clearInterval(interval);
  }, [playing, gridMode, fast, frames.length]);

  if (!frames || frames.length === 0) return null;

  const currentSrc = frames[frameIdx % frames.length] || frames[0];

  return (
    <div className="rounded-2xl overflow-hidden border border-pink-500/30 bg-black/50 mb-2">
      {gridMode ? (
        <div className="grid grid-cols-2 gap-1 p-1">
          {frames.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setFrameIdx(i);
                setGridMode(false);
              }}
              className="relative rounded-lg overflow-hidden aspect-[3/4] group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Frame ${i + 1}`}
                onError={(e) => {
                  e.currentTarget.src = fallbackSrc;
                }}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-pink-200">
                {i + 1}. {FRAME_LABELS[i] || `Frame ${i + 1}`}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={`Motion frame ${frameIdx + 1}`}
            onError={(e) => {
              e.currentTarget.src = fallbackSrc;
            }}
            className={`w-full object-cover transition-opacity duration-300 ${
              compact ? "aspect-[3/4]" : "max-h-96 aspect-[3/4]"
            }`}
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/75 border border-pink-500/40 px-2.5 py-1 text-[10px] font-medium text-pink-200">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
            <span>
              {frameIdx + 1}/{frames.length} · {FRAME_LABELS[frameIdx] || "Scene"}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-2 bg-zinc-950/90 border-t border-white/10 text-[11px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1 rounded-lg bg-pink-500/20 border border-pink-500/40 px-2 py-1 text-pink-200 hover:bg-pink-500/30"
          >
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {playing ? "Pause" : "Loop"}
          </button>
          <button
            type="button"
            onClick={() => setFast((f) => !f)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:border-pink-500/40"
          >
            {fast ? "2x Pace" : "1x Pace"}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {frames.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Jump to frame ${i + 1}`}
              onClick={() => {
                setFrameIdx(i);
                setPlaying(false);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === frameIdx ? "w-4 bg-pink-500" : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setGridMode((g) => !g)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:border-pink-500/40"
        >
          {gridMode ? <Film className="h-3 w-3" /> : <Grid className="h-3 w-3" />}
          {gridMode ? "Player" : "4-Grid"}
        </button>
      </div>
    </div>
  );
}
