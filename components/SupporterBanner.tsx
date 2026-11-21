"use client";

import { useEffect, useState } from "react";
import { Coffee, Heart, X } from "lucide-react";
import { getKofiUrl, getSubscribeStarUrl, isSupporter } from "@/lib/wallet";

const DISMISS_UNTIL_KEY = "vm-supporter-banner-until";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function SupporterBanner({ onOpenWallet }: { onOpenWallet: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (isSupporter()) return;
      const raw = localStorage.getItem(DISMISS_UNTIL_KEY);
      const until = raw ? Number(raw) : 0;
      if (!until || Date.now() > until) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const kofiUrl = getKofiUrl();
  const subscribeStarUrl = getSubscribeStarUrl();

  const dismissForSevenDays = () => {
    try {
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + SEVEN_DAYS_MS));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <aside
      aria-label="Optional $3 Supporter Banner"
      className="mb-5 rounded-2xl border border-[#ff5678]/30 bg-gradient-to-r from-[#ff5678]/10 via-[#18181c] to-amber-500/10 px-4 py-3 shadow-lg"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 pr-4">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5678] fill-current" />
          <p className="text-xs leading-relaxed text-zinc-300">
            <strong className="text-white">VelvetMotion has no platform message or memory paywall.</strong>{" "}
            Connected AI services may have costs or limits. If you enjoy the app, an optional{" "}
            <strong className="text-[#ff8aa1]">$3 tip</strong> helps support development.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {kofiUrl && (
            <a
              href={kofiUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full neon-btn-primary px-3.5 py-1.5 text-[11px] font-bold text-white"
            >
              <Coffee className="h-3.5 w-3.5" /> Drop $3 on Ko-fi
            </a>
          )}
          {subscribeStarUrl && (
            <a
              href={subscribeStarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#1f1f25] px-3 py-1.5 text-[11px] font-semibold text-white hover:border-[#ff5678]/50"
            >
              SubscribeStar
            </a>
          )}
          <button
            type="button"
            onClick={onOpenWallet}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-3.5 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25"
          >
            {kofiUrl ? "Crypto Tip / Wallet" : "☕ Support Dev ($3)"}
          </button>
          <button
            type="button"
            onClick={dismissForSevenDays}
            aria-label="Dismiss supporter banner for 7 days"
            title="Hide for 7 days"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
