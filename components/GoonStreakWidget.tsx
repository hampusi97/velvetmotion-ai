"use client";

import { useEffect, useState } from "react";
import { Flame, Clock, Zap, Award, Sparkles, X } from "lucide-react";
import { getGoonStats, recordGoonActivity, recordNewSession, type GoonStats } from "@/lib/streaks";

export function GoonStreakWidget() {
  const [stats, setStats] = useState<GoonStats>(() => getGoonStats());
  const [isOpen, setIsOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    setStats(getGoonStats());
    const interval = setInterval(() => {
      // Periodic gentle time accumulation while app is open
      const updated = recordGoonActivity(1, 0);
      setStats(updated);
    }, 60000); // every minute
    return () => clearInterval(interval);
  }, []);

  const handleBoost = () => {
    setPulsing(true);
    const updated = recordNewSession();
    setStats(updated);
    setTimeout(() => setPulsing(false), 1200);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`press inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-gradient-to-r from-pink-600/20 to-fuchsia-600/20 px-3 py-1 text-xs font-medium text-pink-200 hover:border-pink-500/60 transition shadow-sm ${
          pulsing ? "animate-bounce ring-2 ring-pink-500" : ""
        }`}
        title="View Goon Streak & Intensity Stats"
      >
        <Flame className="h-3.5 w-3.5 text-pink-400 fill-pink-500 animate-pulse" />
        <span className="font-bold">{stats.streak}d Streak</span>
        <span className="hidden md:inline text-pink-300/80">({stats.maxIntensity}%)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-pink-500/30 bg-ink-900 p-6 text-cream shadow-2xl overflow-hidden">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-pink-600/20 blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-pink-500 fill-pink-500" />
                <h3 className="font-display text-xl tracking-wide text-pink-200">Goon Streak & Stats</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-zinc-400 hover:text-white bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center py-3 bg-pink-500/10 rounded-2xl border border-pink-500/20 mb-5">
              <div className="text-xs uppercase tracking-wider text-pink-300 font-semibold">Current Rank</div>
              <div className="text-lg font-bold text-cream mt-0.5 flex items-center justify-center gap-1.5">
                <Award className="h-4 w-4 text-amber-400" />
                {stats.rankTitle}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl border border-white/10 bg-ink-950 p-3.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                  <Flame className="h-3.5 w-3.5 text-pink-400" />
                  Streak Days
                </div>
                <div className="text-2xl font-bold text-pink-200">{stats.streak} Days</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-ink-950 p-3.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                  <Clock className="h-3.5 w-3.5 text-fuchsia-400" />
                  Time Invested
                </div>
                <div className="text-2xl font-bold text-fuchsia-200">{stats.totalMinutes} mins</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-ink-950 p-3.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Max Intensity
                </div>
                <div className="text-2xl font-bold text-amber-200">{stats.maxIntensity}%</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-ink-950 p-3.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  Total Sessions
                </div>
                <div className="text-2xl font-bold text-purple-200">{stats.sessions}</div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Intensity Progression</span>
                <span className="text-pink-300">{stats.maxIntensity} / 100 max</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-ink-950 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.maxIntensity)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleBoost}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-95 transition press flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Boost Intensity & Record Session (+5m, +5% Intensity)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
