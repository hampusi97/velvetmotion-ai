"use client";

import { Heart, Sparkles, Coins, X } from "lucide-react";
import { claimSupporterBonus, dismissSupportPrompt, getDonationUrl } from "@/lib/wallet";

export function SupportModal({
  onClose,
  onOpenWallet,
  onCoinsChanged,
}: {
  onClose: () => void;
  onOpenWallet: () => void;
  onCoinsChanged?: (coins: number) => void;
}) {
  const handleSkipWithFreeCoins = () => {
    const nextBalance = dismissSupportPrompt(true);
    onCoinsChanged?.(nextBalance);
    onClose();
  };

  const handleDonateFive = () => {
    const url = getDonationUrl();
    if (typeof window !== "undefined" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    const { balance } = claimSupporterBonus("dev-boost-5");
    onCoinsChanged?.(balance);
    onOpenWallet();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleSkipWithFreeCoins}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-pink-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 shadow-[0_0_80px_rgba(236,72,153,0.35)] space-y-4">
        <button
          type="button"
          onClick={handleSkipWithFreeCoins}
          aria-label="Close support note"
          className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-3 py-1 text-xs font-medium text-pink-200">
          <Heart className="h-3.5 w-3.5 text-pink-400 fill-current" />
          100% Optional · Free Forever
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-white leading-tight">
            Help Us Build VelvetMotion 💖
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            VelvetMotion is <strong className="text-pink-300">100% free</strong> with no paywalls or required subscriptions.
            If you enjoy the companions, a <strong className="text-amber-300">$5 donation</strong> would be hugely appreciated
            to help develop new features, faster NSFW video models, and server upgrades — but you never have to!
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-fuchsia-500/10 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-amber-200 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-300" /> $5 Developer Boost
            </span>
            <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
              +3,500 Bonus Coins
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            Unlocks +3,500 thank-you coins &amp; the VIP Supporter badge in your Coin Wallet.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleDonateFive}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/30 hover:opacity-95 transition"
          >
            💝 Donate $5 to Support Development (+3,500 Coins)
          </button>

          <button
            type="button"
            onClick={() => {
              dismissSupportPrompt(false);
              onOpenWallet();
              onClose();
            }}
            className="w-full rounded-2xl border border-pink-500/35 bg-pink-500/10 py-2.5 text-xs font-medium text-pink-200 hover:bg-pink-500/20 transition"
          >
            🪙 Open Coin Wallet (Crypto / Tiers / Free Refills)
          </button>

          <button
            type="button"
            onClick={handleSkipWithFreeCoins}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-xs text-zinc-300 hover:bg-white/10 transition flex items-center justify-center gap-1.5"
          >
            <Coins className="h-3.5 w-3.5 text-amber-300" />
            No thanks, continue free (+250 free login coins)
          </button>
        </div>
      </div>
    </div>
  );
}
