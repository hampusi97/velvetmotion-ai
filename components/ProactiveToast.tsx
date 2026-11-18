"use client";

import type { ProactivePing } from "@/lib/proactiveIdle";

export function ProactiveToast({
  ping,
  onOpen,
  onDismiss,
}: {
  ping: ProactivePing;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-xs w-full animate-in fade-in">
      <div className="rounded-2xl border border-pink-500/40 bg-zinc-950/95 backdrop-blur shadow-[0_0_40px_rgba(236,72,153,0.25)] p-4">
        <div className="text-[10px] uppercase tracking-wide text-pink-400 mb-1">She texted first</div>
        <div className="text-sm font-medium text-cream">{ping.characterName}</div>
        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{ping.text}</p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-2 text-xs font-semibold"
          >
            Reply
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 rounded-xl border border-white/15 text-xs text-zinc-400"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
