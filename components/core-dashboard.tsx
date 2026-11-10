"use client";

import { useEffect, useState } from "react";
import { activeStreak, DAILY_CREDITS, dayKey, type Progress } from "@/lib/progress";

interface Props {
  progress: Progress;
  ready: boolean;
  storageAvailable: boolean;
  favorites: { id: string; name: string }[];
  resumeName?: string;
  onClaim: () => Promise<void>;
  onNightMode: () => void;
  onResume: () => void;
  onFavorite: (id: string) => void;
}

export function CoreDashboard({ progress, ready, storageAvailable, favorites, resumeName, onClaim, onNightMode, onResume, onFavorite }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [claiming, setClaiming] = useState(false);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const claimed = !!progress.lastClaim && progress.lastClaim >= dayKey(now);
  const streak = activeStreak(progress, now);

  return <section aria-labelledby="dashboard-heading" className="mt-6 rounded-3xl border border-white/10 bg-ink-900 p-5 md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs uppercase tracking-widest text-rose-200">Your space</p><h2 id="dashboard-heading" className="mt-1 font-display text-2xl text-cream">Welcome back</h2></div>
      <button type="button" aria-pressed={progress.nightMode} disabled={!ready} onClick={onNightMode} className="min-h-11 rounded-full border border-white/20 px-4 text-sm disabled:opacity-40">Night mode: {progress.nightMode ? "On" : "Off"}</button>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 p-4">
        <p className="text-sm text-mist">Demo credits</p><p className="mt-1 text-3xl font-semibold" aria-live="polite">{ready ? progress.credits : "—"}</p>
        <button type="button" disabled={!ready || claimed || claiming} onClick={async () => { setClaiming(true); try { await onClaim(); setNow(new Date()); } finally { setClaiming(false); } }} className="mt-3 min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-medium disabled:opacity-50">{claimed ? "Claimed · back tomorrow" : claiming ? "Claiming…" : `Claim ${DAILY_CREDITS} daily credits`}</button>
      </div>
      <div className="rounded-2xl border border-white/10 p-4"><p className="text-sm text-mist">Daily streak</p><p className="mt-1 text-3xl font-semibold">{ready ? streak : "—"} <span className="text-base font-normal">{streak === 1 ? "day" : "days"}</span></p><p className="mt-3 text-sm text-mist">Check in each day to keep it going.</p></div>
    </div>
    {resumeName && <button type="button" onClick={onResume} className="mt-4 min-h-11 w-full rounded-2xl border border-rose-200/30 p-4 text-left text-rose-200">Continue Last Session <span className="block text-sm text-mist">With {resumeName}</span></button>}
    <div className="mt-5"><h3 className="font-medium">Pinned favorites</h3>{favorites.length ? <ul className="mt-2 flex flex-wrap gap-2">{favorites.map(character => <li key={character.id}><button type="button" onClick={() => onFavorite(character.id)} className="min-h-11 rounded-full border border-white/20 px-4 text-sm">{character.name}</button></li>)}</ul> : <p className="mt-2 text-sm text-mist">Pin a favorite from their profile to find them here.</p>}</div>
    <p role="status" className="mt-5 text-xs leading-relaxed text-mist">{storageAvailable ? "Progress and chats stay in this browser. Demo credits have no cash value and cannot be spent yet. Clearing browser data removes progress." : "Browser storage is unavailable. Progress will last only for this visit."}</p>
  </section>;
}
