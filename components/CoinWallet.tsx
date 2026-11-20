"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Coins, Gift, Heart, LockKeyhole, Sparkles, Wallet } from "lucide-react";
import { canClaimDaily, claimDaily, getCoins } from "@/lib/storage";
import { claimFreeWalletRefill, loadWalletTransactions, type WalletTransaction } from "@/lib/wallet";

/**
 * Browser demo credits are not a regulated stored value, payment ledger,
 * cryptocurrency wallet, verified donation, or purchased model capacity.
 *
 * Deliberately omits the legacy unverified "claim supporter bonus" and
 * simulated donors/prizes. Those need a trusted server and payment processor.
 */
export function CoinWallet({
  onHome, onPreviewLoginModal, onCoinsChanged,
}: {
  onHome: () => void;
  onPreviewLoginModal?: () => void;
  onCoinsChanged?: (coins: number) => void;
}) {
  const [coins, setCoins] = useState(0);
  const [dailyAvailable, setDailyAvailable] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const supportUrl = (process.env.NEXT_PUBLIC_SUPPORT_URL || "").trim();
  const validSupportUrl = (() => {
    try {
      const u = new URL(supportUrl);
      return u.protocol === "https:" ? u.href : "";
    } catch { return ""; }
  })();

  const refresh = () => {
    const balance = getCoins();
    setCoins(balance);
    setDailyAvailable(canClaimDaily());
    setTransactions(loadWalletTransactions().slice(0, 15));
    onCoinsChanged?.(balance);
  };

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("vm:coins-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("vm:coins-changed", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const daily = () => {
    const reward = claimDaily();
    refresh();
    setMessage(reward > 0 ? `Claimed ${reward} demo credits.` : "Today's demo-credits claim has already been used.");
  };

  const refill = () => {
    const { balance } = claimFreeWalletRefill(500);
    refresh();
    onCoinsChanged?.(balance);
    setMessage("Added 500 demo credits. They do not represent a payment or purchased AI generation.");
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-20 text-white">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onHome} className="inline-flex items-center gap-1.5 text-xs text-[#e4b1c5] hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to VelvetMotion
        </button>
        {onPreviewLoginModal && <button type="button" onClick={onPreviewLoginModal}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:text-white">Preview account dialog</button>}
      </div>
      <section className="relative isolate overflow-hidden rounded-[30px] border border-[#e4b3c5]/20 bg-gradient-to-br from-[#392239] via-[#1b1623] to-[#100f16] p-6 sm:p-9">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-rose-300/10 blur-[85px]" aria-hidden="true" />
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#e6b9c9]">
          <Wallet className="h-4 w-4" /> VelvetMotion / Demo wallet
        </span>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">Your play credits.</h1>
        <div className="mt-7 flex items-end gap-3">
          <Coins className="mb-2 h-8 w-8 text-[#ebc8a0]" aria-hidden="true" />
          <span className="font-display text-5xl font-semibold tabular-nums text-white">{coins.toLocaleString()}</span>
          <span className="mb-2 text-sm text-[#d6b6c6]">demo credits</span>
        </div>
        <p className="mt-5 max-w-2xl text-xs leading-6 text-zinc-300">
          These are optional browser-game points only. They aren't money, don't verify purchases,
          and don't pay a connected AI provider. Real model availability and costs depend on your configured engine.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={daily} disabled={!dailyAvailable}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#c67997] to-[#a45c85] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">
            <Gift className="h-4 w-4" /> {dailyAvailable ? "Claim daily demo credits" : "Daily claim used"}
          </button>
          <button type="button" onClick={refill}
            className="inline-flex items-center gap-2 rounded-full border border-[#e6bccc]/30 bg-white/[.05] px-5 py-2.5 text-xs font-semibold text-rose-100 hover:bg-white/[.08]">
            <Sparkles className="h-4 w-4" /> Free refill +500
          </button>
        </div>
        {message && <p role="status" className="mt-4 inline-flex items-center gap-2 text-xs text-[#ebd0d8]">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </p>}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[24px] border border-white/10 bg-[#201721] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Heart className="h-5 w-5 text-[#e49eb9]" /> Optional developer support
          </h2>
          <p className="mt-3 text-xs leading-6 text-zinc-300">
            Supporting development is optional. This app currently does not have a verified payment,
            donation receipt, subscription, prize, or paid credit fulfillment system.
          </p>
          {validSupportUrl ? (
            <a href={validSupportUrl} target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-full border border-rose-300/30 bg-rose-300/10 px-5 py-2.5 text-xs font-semibold text-rose-100">
              Open independently configured support page
            </a>
          ) : <p className="mt-4 rounded-xl border border-white/10 p-3 text-xs text-zinc-400">No official payment page is configured.</p>}
          <p className="mt-4 text-[11px] leading-5 text-zinc-500">
            Payment verification and account-entitlements must be handled by a secure server,
            not a browser click or user-submitted transaction ID.
          </p>
        </section>
        <section className="rounded-[24px] border border-white/10 bg-[#201721] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <LockKeyhole className="h-5 w-5 text-[#e49eb9]" /> Local activity
          </h2>
          <p className="mt-2 text-xs text-zinc-400">These are device-only demo events, not invoices or verified transactions.</p>
          {transactions.length ? (
            <ul className="mt-4 space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-start justify-between gap-3 border-b border-white/10 py-2 text-xs">
                  <span className="text-zinc-300">{tx.label}</span>
                  <span className="shrink-0 font-mono text-[#e9bec9]">+{tx.amount}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-5 text-xs text-zinc-500">No local credit events yet.</p>}
        </section>
      </div>
    </main>
  );
}
