"use client";

import { useEffect, useState } from "react";
import {
  Coins,
  Heart,
  Sparkles,
  Copy,
  Check,
  Gift,
  ExternalLink,
  Crown,
} from "lucide-react";
import { canClaimDaily, claimDaily, getCoins } from "@/lib/storage";
import {
  CRYPTO_WALLETS,
  DONATION_TIERS,
  PRIMARY_BTC_WALLET,
  claimFreeWalletRefill,
  claimSupporterBonus,
  getDonationUrl,
  isSupporter,
  loadWalletTransactions,
  setDonationUrl,
  type DonationTier,
  type WalletTransaction,
} from "@/lib/wallet";

export function CoinWallet({
  onHome,
  onPreviewLoginModal,
  onCoinsChanged,
}: {
  onHome: () => void;
  onPreviewLoginModal?: () => void;
  onCoinsChanged?: (coins: number) => void;
}) {
  const [coins, setCoins] = useState(1200);
  const [supporter, setSupporter] = useState(false);
  const [canDaily, setCanDaily] = useState(false);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [donateUrl, setDonateUrlState] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);

  const refresh = () => {
    const c = getCoins();
    setCoins(c);
    setSupporter(isSupporter());
    setCanDaily(canClaimDaily());
    setTxs(loadWalletTransactions());
    setDonateUrlState(getDonationUrl());
    onCoinsChanged?.(c);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFreeRefill = () => {
    const { balance } = claimFreeWalletRefill(500);
    setNotice("Added +500 free coins to your wallet! VelvetMotion is always free to play.");
    refresh();
    onCoinsChanged?.(balance);
  };

  const handleDailyClaim = () => {
    const reward = claimDaily();
    if (reward > 0) {
      setNotice(`Claimed +${reward} daily coins!`);
      refresh();
    }
  };

  const handleSupportTier = async (tier: DonationTier) => {
    try {
      await navigator.clipboard.writeText(PRIMARY_BTC_WALLET);
      setCopiedSymbol("BTC");
      setTimeout(() => setCopiedSymbol(null), 2500);
    } catch {
      /* ignore */
    }
    const url = getDonationUrl();
    if (typeof window !== "undefined" && url) {
      if (url.startsWith("bitcoin:")) {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
    const { balance } = claimSupporterBonus(tier.id);
    setNotice(
      `Copied BTC wallet (${PRIMARY_BTC_WALLET})! Thank you for supporting VelvetMotion ($${tier.amountUsd}) — unlocked +${tier.bonusCoins.toLocaleString()} bonus coins & VIP Supporter badge.`,
    );
    refresh();
    onCoinsChanged?.(balance);
  };

  const handleCopyCrypto = async (symbol: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedSymbol(symbol);
      setTimeout(() => setCopiedSymbol(null), 2000);
    } catch {
      setNotice(`Address (${symbol}): ${address}`);
    }
  };

  const handleSaveDonateUrl = () => {
    setDonationUrl(donateUrl);
    setEditingUrl(false);
    setNotice("Updated donation link for this device.");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
          ← Home
        </button>
        {onPreviewLoginModal && (
          <button
            type="button"
            onClick={onPreviewLoginModal}
            className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs text-pink-200 hover:bg-pink-500/20"
          >
            Preview Login $5 Popup
          </button>
        )}
      </div>

      {/* Wallet Hero Balance */}
      <div className="rounded-3xl border border-pink-500/35 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 shadow-[0_0_60px_rgba(236,72,153,0.2)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-pink-300">
              <Coins className="h-4 w-4 text-amber-300" /> VelvetMotion Coin Wallet
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-white mt-1 flex items-center gap-3">
              <span className="tabular-nums text-amber-300">{coins.toLocaleString()}</span>
              <span className="text-lg font-sans font-normal text-zinc-400">coins</span>
              {supporter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-semibold text-amber-200">
                  <Crown className="h-3.5 w-3.5 text-amber-300" /> VIP Supporter
                </span>
              )}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {canDaily && (
              <button
                type="button"
                onClick={handleDailyClaim}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-400/40 bg-amber-500/20 px-4 py-2.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
              >
                <Gift className="h-4 w-4 text-amber-300" /> Claim Daily (+200)
              </button>
            )}
            <button
              type="button"
              onClick={handleFreeRefill}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
            >
              <Sparkles className="h-4 w-4 text-emerald-300" /> Free Instant Refill (+500 Coins)
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          VelvetMotion is <strong className="text-emerald-300">100% free forever</strong> — grab free coin refills anytime above.
          If you want to support the developer, a <strong className="text-pink-300">$5 donation</strong> is hugely appreciated
          to help build new features, faster NSFW video generators, and better servers!
        </p>

        {notice && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
            {notice}
          </div>
        )}

        {/* Primary Bitcoin Donation Address Banner */}
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-pink-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-500/25 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                OFFICIAL BTC WALLET
              </span>
              <span className="text-xs text-zinc-300">
                $5 appreciated to support development (100% optional)
              </span>
            </div>
            <div className="mt-1.5 font-mono text-xs sm:text-sm text-amber-100 break-all select-all">
              {PRIMARY_BTC_WALLET}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopyCrypto("BTC", PRIMARY_BTC_WALLET)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
            >
              {copiedSymbol === "BTC" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" /> Copied BTC
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy BTC Wallet
                </>
              )}
            </button>
            <a
              href={`bitcoin:${PRIMARY_BTC_WALLET}?label=VelvetMotion%20AI%20Support`}
              className="inline-flex items-center gap-1 rounded-xl border border-pink-500/40 bg-pink-500/15 px-3 py-2 text-xs font-semibold text-pink-200 hover:bg-pink-500/25"
            >
              Open Wallet
            </a>
          </div>
        </div>
      </div>

      {/* Optional Donation Tiers (Highlighting $5 Dev Boost) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-cream flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400 fill-current" />
            Optional Developer Support (Never Required)
          </h2>
          <button
            type="button"
            onClick={() => setEditingUrl((v) => !v)}
            className="text-xs text-zinc-400 hover:text-pink-300"
          >
            {editingUrl ? "Hide link config" : "Configure donation link"}
          </button>
        </div>

        {editingUrl && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-2">
            <label className="text-xs text-zinc-400 block">
              Your Donation Page URL (Ko-fi, BuyMeACoffee, Stripe Payment Link, or PayPal.Me)
            </label>
            <div className="flex gap-2">
              <input
                value={donateUrl}
                onChange={(e) => setDonateUrlState(e.target.value)}
                placeholder="https://ko-fi.com/yourname"
                className="flex-1 rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleSaveDonateUrl}
                className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Save URL
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {DONATION_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col justify-between rounded-3xl border p-5 transition ${
                tier.featured
                  ? "border-pink-500 bg-gradient-to-b from-pink-950/50 via-zinc-900 to-black shadow-[0_0_40px_rgba(236,72,153,0.25)]"
                  : "border-white/10 bg-zinc-900/60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl font-extrabold text-white">${tier.amountUsd}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      tier.featured
                        ? "bg-pink-600 text-white"
                        : "border border-amber-400/40 bg-amber-500/15 text-amber-200"
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>
                <div className="font-semibold text-sm text-cream">{tier.label}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{tier.description}</p>
              </div>

              <button
                type="button"
                onClick={() => handleSupportTier(tier)}
                className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition ${
                  tier.featured
                    ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25 hover:opacity-95"
                    : "border border-pink-500/40 bg-pink-500/10 text-pink-100 hover:bg-pink-500/20"
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Donate ${tier.amountUsd} (+{tier.bonusCoins.toLocaleString()} Coins)
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Crypto Coin Wallet Addresses */}
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-cream">Crypto Coin Wallet (Direct Tip)</h3>
            <p className="text-xs text-zinc-400">
              Prefer crypto? Send any tip ($5 or any amount) and tap claim below for your supporter bonus.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const { balance } = claimSupporterBonus("dev-boost-5");
              setNotice("Thank you for your crypto donation! +3,500 supporter coins & VIP badge unlocked.");
              refresh();
              onCoinsChanged?.(balance);
            }}
            className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
          >
            I Sent a Tip · Claim +3,500 Coins
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {CRYPTO_WALLETS.map((w) => (
            <div
              key={w.symbol}
              className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/50 p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-200">
                    {w.symbol}
                  </span>
                  <span className="text-[11px] text-zinc-400 truncate">{w.network}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-zinc-300 truncate">{w.address}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyCrypto(w.symbol, w.address)}
                className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
              >
                {copiedSymbol === w.symbol ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Wallet Ledger / Activity */}
      {txs.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-cream">Recent Wallet Activity</h3>
          <ul className="space-y-2">
            {txs.slice(0, 10).map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-xs"
              >
                <span className="text-zinc-300 truncate">{tx.label}</span>
                <span className="shrink-0 font-mono font-semibold text-emerald-300">
                  +{tx.amount.toLocaleString()} coins
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
