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
  Trophy,
  Flame,
} from "lucide-react";
import { canClaimDaily, claimDaily, getCoins } from "@/lib/storage";
import {
  CRYPTO_WALLETS,
  DEFAULT_LEADERBOARD,
  DONATION_TIERS,
  OWNER_PRIZES,
  PRIMARY_BTC_WALLET,
  buildRankedLeaderboard,
  claimFreeWalletRefill,
  claimSupporterBonus,
  getDonationUrl,
  getMyDonationStats,
  isSupporter,
  loadLeaderboard,
  loadWalletTransactions,
  saveMyDonationProfile,
  setDonationUrl,
  type DonationTier,
  type LeaderboardEntry,
  type UserDonationStats,
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<UserDonationStats>(() => getMyDonationStats());
  const [profileName, setProfileName] = useState("");
  const [profileContact, setProfileContact] = useState("");
  const [profileGirl, setProfileGirl] = useState("Maren");
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [donateUrl, setDonateUrlState] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [btcTxid, setBtcTxid] = useState("");
  const [verifyingTx, setVerifyingTx] = useState(false);

  const handleVerifyBtcTx = async () => {
    const clean = btcTxid.trim();
    if (!clean || verifyingTx) return;
    setVerifyingTx(true);
    setNotice(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-btc", txid: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        setNotice(data.error || "Could not verify Bitcoin transaction.");
      } else {
        const tierId = data.satsReceived >= 15000 ? "gpu-patron-15" : "dev-boost-5";
        const { balance, leaderboard: nextBoard } = claimSupporterBonus(tierId, clean);
        const rank = nextBoard.find((e) => e.isCurrentUser)?.rank ?? 1;
        setNotice(`✓ ${data.note} You are Rank #${rank} on the Top Donators Leaderboard!`);
        setBtcTxid("");
        refresh();
        onCoinsChanged?.(balance);
      }
    } catch {
      setNotice("Network error verifying transaction.");
    } finally {
      setVerifyingTx(false);
    }
  };

  const refresh = () => {
    const c = getCoins();
    const stats = getMyDonationStats();
    setCoins(c);
    setSupporter(isSupporter());
    setCanDaily(canClaimDaily());
    setTxs(loadWalletTransactions());
    setLeaderboard(loadLeaderboard());
    setMyStats(stats);
    setProfileName(stats.username);
    setProfileContact(stats.contactHandle);
    setProfileGirl(stats.favoriteGirl);
    setDonateUrlState(getDonationUrl());
    onCoinsChanged?.(c);
  };

  useEffect(() => {
    refresh();
    // Subscribe to persistent Firestore Top Donators Leaderboard (`donatorLeaderboard`)
    let unsubFirestore = () => {};
    void import("@/lib/firebase")
      .then((fb) =>
        fb.subscribeDonatorLeaderboardFromFirestore((cloudRows) => {
          if (!cloudRows.length) return;
          const merged = buildRankedLeaderboard(
            [...DEFAULT_LEADERBOARD, ...cloudRows],
            getMyDonationStats(),
          );
          setLeaderboard(merged);
        }),
      )
      .then((u) => {
        unsubFirestore = u;
      })
      .catch(() => {});

    // Also fetch server leaderboard snapshot
    void fetch("/api/wallet", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.leaderboard) && data.leaderboard.length > 0) {
          setLeaderboard((prev) => (prev.length > 0 ? prev : loadLeaderboard()));
        }
      })
      .catch(() => {});
    return () => {
      unsubFirestore();
    };
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

  const handleSaveProfile = () => {
    saveMyDonationProfile({
      username: profileName,
      contactHandle: profileContact,
      favoriteGirl: profileGirl,
    });
    setNotice("Saved your Leaderboard name & prize contact handle so the owner can reach you when you win!");
    refresh();
  };

  const handleSupportTier = async (tier: DonationTier) => {
    saveMyDonationProfile({
      username: profileName,
      contactHandle: profileContact,
      favoriteGirl: profileGirl,
    });
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
    const { balance, stats, newlyUnlockedPrizes, leaderboard: nextBoard } = claimSupporterBonus(tier.id);
    const myRank = nextBoard.find((e) => e.isCurrentUser)?.rank ?? 1;
    const prizeNote =
      newlyUnlockedPrizes.length > 0
        ? ` 🏆 UNLOCKED OWNER PRIZE: ${newlyUnlockedPrizes.map((p) => p.title).join(", ")}!`
        : "";
    setNotice(
      `Copied BTC wallet (${PRIMARY_BTC_WALLET})! Thank you for supporting ($${tier.amountUsd}) — Leaderboard Rank #${myRank} (Streak: ${stats.donationCount}x · Total: $${stats.totalUsd}).${prizeNote}`,
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

  const myLeaderboardRow = leaderboard.find(
    (e) => e.isCurrentUser || e.username.toLowerCase() === myStats.username.toLowerCase(),
  );
  const nextPrize =
    OWNER_PRIZES.find((p) => !myStats.unlockedPrizeIds.includes(p.id)) ||
    OWNER_PRIZES[OWNER_PRIZES.length - 1];
  const progressPct = Math.min(
    100,
    Math.round(
      Math.max(
        (myStats.totalUsd / Math.max(1, nextPrize.minUsd)) * 100,
        (myStats.donationCount / Math.max(1, nextPrize.minDonations)) * 100,
      ),
    ),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
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
              <Coins className="h-4 w-4 text-amber-300" /> VelvetMotion Coin Wallet &amp; VIP Rewards
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-white mt-1 flex flex-wrap items-center gap-3">
              <span className="tabular-nums text-amber-300">{coins.toLocaleString()}</span>
              <span className="text-lg font-sans font-normal text-zinc-400">coins</span>
              {supporter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-semibold text-amber-200">
                  <Crown className="h-3.5 w-3.5 text-amber-300" /> VIP Supporter
                </span>
              )}
              {myLeaderboardRow && (
                <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/20 border border-pink-400/50 px-3 py-1 text-xs font-semibold text-pink-200">
                  <Trophy className="h-3.5 w-3.5 text-amber-300" /> Rank #{myLeaderboardRow.rank} Donator
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
          and climbs the <strong className="text-amber-300">Top Donators Leaderboard</strong> where repeat supporters win{" "}
          <strong className="text-pink-200">custom dream companions, private 4K video packs, and mystery prizes directly from the owner!</strong>
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
                $5 appreciated · counts toward Top Donators Leaderboard &amp; Owner Prizes
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
          <div className="w-full pt-2 border-t border-white/10 flex flex-wrap gap-2">
            <input
              value={btcTxid}
              onChange={(e) => setBtcTxid(e.target.value)}
              placeholder="Optional: Paste 64-char BTC TXID for live on-chain verification via Mempool.space"
              className="flex-1 min-w-[200px] rounded-xl border border-white/15 bg-black/70 px-3 py-1.5 font-mono text-[11px] text-zinc-200 outline-none focus:border-amber-400"
            />
            <button
              type="button"
              disabled={verifyingTx || btcTxid.trim().length < 16}
              onClick={() => void handleVerifyBtcTx()}
              className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
            >
              {verifyingTx ? "Verifying…" : "Verify On-Chain ✓"}
            </button>
          </div>
        </div>
      </div>

      {/* Optional Donation Tiers (Highlighting $5 Dev Boost) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-cream flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400 fill-current" />
            Optional Developer Support &amp; Leaderboard Boost
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
              Your Donation Page URL (Bitcoin URI, Ko-fi, BuyMeACoffee, Stripe, or PayPal.Me)
            </label>
            <div className="flex gap-2">
              <input
                value={donateUrl}
                onChange={(e) => setDonateUrlState(e.target.value)}
                placeholder="bitcoin:bc1qjmf9u3cmrn59q5nqmzgkvrgy7exegnfmph999k"
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
                onClick={() => void handleSupportTier(tier)}
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

      {/* Owner Prizes Showcase — Win Prizes Directly From the Owner */}
      <section className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-950/25 via-zinc-950 to-pink-950/25 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Trophy className="h-4 w-4 text-amber-300" /> Win Prizes Directly From The Owner
            </div>
            <h2 className="font-display text-2xl text-white mt-0.5">
              Repeat &amp; Top Donator Prize Pool 🎁
            </h2>
            <p className="text-xs text-zinc-300 mt-1">
              Keep donating to build your streak and climb the leaderboard — top &amp; repeat donators receive custom companions, 4K renders, and mystery gifts directly from the owner!
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-amber-200">Your Streak &amp; Total</div>
            <div className="text-sm font-bold text-white flex items-center justify-end gap-1.5">
              <Flame className="h-4 w-4 text-amber-400" />
              {myStats.donationCount}x Donations · ${myStats.totalUsd}
            </div>
          </div>
        </div>

        {/* Next Prize Progress Bar */}
        <div className="rounded-2xl border border-white/10 bg-black/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300">
              Next Owner Prize Goal: <strong className="text-amber-300">{nextPrize.title}</strong>
            </span>
            <span className="font-mono text-amber-200">
              ${myStats.totalUsd}/${nextPrize.minUsd} or {myStats.donationCount}/{nextPrize.minDonations}x streak ({progressPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-fuchsia-500 transition-all"
              style={{ width: `${Math.max(6, progressPct)}%` }}
            />
          </div>
        </div>

        {/* 3 Owner Prize Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {OWNER_PRIZES.map((prize) => {
            const unlocked = myStats.unlockedPrizeIds.includes(prize.id);
            return (
              <div
                key={prize.id}
                className={`rounded-2xl border p-4 space-y-2 ${
                  unlocked
                    ? "border-emerald-400/60 bg-emerald-950/30"
                    : "border-amber-500/25 bg-zinc-900/75"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">
                    {prize.badge}
                  </span>
                  {unlocked && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                      ✓ Unlocked
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-white">{prize.title}</div>
                <div className="text-[11px] font-medium text-pink-300">{prize.rankRequirement}</div>
                <p className="text-xs text-zinc-300 leading-relaxed">{prize.rewardFromOwner}</p>
                <div className="pt-1 text-[11px] font-semibold text-amber-300">
                  +{prize.bonusCoins.toLocaleString()} Milestone Bonus Coins
                </div>
              </div>
            );
          })}
        </div>

        {/* Donator Handle & Direct Owner Prize Contact Form */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-3">
          <div className="text-xs font-semibold text-pink-200">
            Your Leaderboard Display Name &amp; Direct Owner Prize Delivery Contact
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Leaderboard Name"
              className="rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white"
            />
            <input
              value={profileContact}
              onChange={(e) => setProfileContact(e.target.value)}
              placeholder="Telegram / Discord / Email for Prizes"
              className="rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white sm:col-span-2"
            />
            <div className="flex gap-2">
              <input
                value={profileGirl}
                onChange={(e) => setProfileGirl(e.target.value)}
                placeholder="Fav Girl"
                className="w-full rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleSaveProfile}
                className="shrink-0 rounded-xl bg-pink-600 px-3 py-2 text-xs font-semibold text-white hover:bg-pink-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Top Donators Leaderboard */}
      <section className="rounded-3xl border border-pink-500/30 bg-zinc-950/90 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl text-white flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-300" />
              Top Donators Leaderboard
            </h2>
            <p className="text-xs text-zinc-400">
              Ranked by total support &amp; repeat donation streaks. Top supporters win direct rewards from the owner!
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
            ● Live Leaderboard
          </span>
        </div>

        {/* Top 3 Podium Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {leaderboard.slice(0, 3).map((entry) => {
            const medal = entry.rank === 1 ? "👑 #1" : entry.rank === 2 ? "🥈 #2" : "🥉 #3";
            return (
              <div
                key={entry.username}
                className={`rounded-2xl border p-4 space-y-1.5 ${
                  entry.rank === 1
                    ? "border-amber-400 bg-gradient-to-b from-amber-500/20 via-zinc-900 to-black shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                    : entry.rank === 2
                      ? "border-zinc-300/40 bg-zinc-900/80"
                      : "border-amber-700/50 bg-zinc-900/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-amber-300">{medal}</span>
                  <span className="rounded-full bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 text-[10px] font-semibold text-pink-200">
                    🔥 {entry.donationCount}x Streak
                  </span>
                </div>
                <div className="font-bold text-base text-white truncate">
                  {entry.username} {entry.isCurrentUser && <span className="text-xs text-emerald-300">(You)</span>}
                </div>
                <div className="text-xl font-extrabold text-amber-200">${entry.totalUsd}</div>
                <div className="text-[11px] text-zinc-400">
                  Fav Girl: <strong className="text-pink-200">{entry.favoriteGirl}</strong>
                </div>
                <div className="text-[11px] text-emerald-300 font-medium pt-0.5">
                  {entry.prizeStatus}
                </div>
              </div>
            );
          })}
        </div>

        {/* Full Leaderboard Table */}
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={`${entry.rank}-${entry.username}`}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${
                entry.isCurrentUser
                  ? "border-pink-500 bg-pink-500/15"
                  : "border-white/10 bg-black/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${
                    entry.rank === 1
                      ? "bg-amber-400 text-black"
                      : entry.rank === 2
                        ? "bg-zinc-300 text-black"
                        : entry.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  #{entry.rank}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-white flex flex-wrap items-center gap-2">
                    <span className="truncate">{entry.username}</span>
                    {entry.isCurrentUser && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                        You
                      </span>
                    )}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-amber-200">
                      {entry.tierTitle}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Fav Companion: <span className="text-pink-300">{entry.favoriteGirl}</span> ·{" "}
                    <span className="text-emerald-300">{entry.prizeStatus}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="rounded-xl border border-pink-500/30 bg-pink-500/10 px-2.5 py-1 text-[11px] font-semibold text-pink-200">
                  🔥 {entry.donationCount}x Donations
                </span>
                <span className="font-mono text-sm font-extrabold text-amber-300">
                  ${entry.totalUsd}
                </span>
              </div>
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
              Prefer crypto? Send any tip ($5 or any amount) and tap claim below to climb the Top Donators Leaderboard!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const { balance, stats, leaderboard: nextBoard } = claimSupporterBonus("dev-boost-5");
              const myRank = nextBoard.find((e) => e.isCurrentUser)?.rank ?? 1;
              setNotice(
                `Thank you for your crypto donation! +3,500 coins added — you are now Rank #${myRank} on the Top Donators Leaderboard (${stats.donationCount}x streak)!`,
              );
              refresh();
              onCoinsChanged?.(balance);
            }}
            className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
          >
            I Sent a Tip · Claim +3,500 Coins &amp; Rank Up
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
