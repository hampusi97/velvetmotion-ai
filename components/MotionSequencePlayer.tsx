"use client";

import { useEffect, useState } from "react";
import { Play, Pause, Grid, Film, ExternalLink } from "lucide-react";

const FRAME_LABELS = ["Opening", "Motion", "Climax", "Afterglow"];

const FREE_VIDEO_TOOLS = [
  { name: "NiftyVid", url: "https://igorcsis.github.io/nifty-vid", note: "No signup" },
  { name: "Google Flow", url: "https://labs.google/fx/tools/flow", note: "50 credits/day" },
];

export function MotionSequencePlayer({
  frames,
  fallbackSrc = "/portraits/maren.jpg",
  compact = false,
  alt,
}: {
  frames: string[];
  fallbackSrc?: string;
  compact?: boolean;
  alt?: string;
}) {
  const [playing, setPlaying] = useState(true);
  const [frameIdx, setFrameIdx] = useState(0);
  const [fast, setFast] = useState(false);
  const [gridMode, setGridMode] = useState(false);
  const [showRealVideo, setShowRealVideo] = useState(false);

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

  const openRealVideo = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
          <img
            src={currentSrc}
            alt={alt || `Motion frame ${frameIdx + 1}`}
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

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowRealVideo((s) => !s)}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 border border-pink-400/50 px-2 py-1 text-white font-medium hover:from-pink-500 hover:to-rose-500"
          >
            <ExternalLink className="h-3 w-3" />
            Real MP4
          </button>
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

      {showRealVideo && (
        <div className="px-2.5 py-2 bg-zinc-900/95 border-t border-pink-500/20 text-[11px]">
          <p className="text-zinc-400 mb-1.5">Make a real MP4 (opens free tool):</p>
          <div className="flex flex-wrap gap-1.5">
            {FREE_VIDEO_TOOLS.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => openRealVideo(tool.url)}
                className="inline-flex items-center gap-1 rounded-lg bg-pink-500/15 border border-pink-500/40 px-2.5 py-1 text-pink-100 hover:bg-pink-500/25"
              >
                {tool.name}
                <span className="text-[9px] text-zinc-400">({tool.note})</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5">
            Generate there, download the MP4, then pin it to your vault.
          </p>
        </div>
      )}
    </div>
  );
}
