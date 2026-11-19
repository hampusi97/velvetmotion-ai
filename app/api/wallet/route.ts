import { NextResponse } from "next/server";
import { checkContentSafety, checkRateLimit, sanitizeUserText } from "@/lib/safety";
import {
  CRYPTO_WALLETS,
  DEFAULT_LEADERBOARD,
  DONATION_TIERS,
  OWNER_PRIZES,
  PRIMARY_BTC_WALLET,
  buildRankedLeaderboard,
  computePrizeStatus,
  computeTierTitle,
  type LeaderboardEntry,
} from "@/lib/wallet";

export const dynamic = "force-dynamic";

let serverLeaderboardEntries: Omit<LeaderboardEntry, "rank">[] = [...DEFAULT_LEADERBOARD];

export async function GET() {
  const leaderboard = buildRankedLeaderboard(serverLeaderboardEntries);
  return NextResponse.json({
    ok: true,
    service: "velvetmotion-coin-wallet",
    policy: "100% free forever — donations are completely optional to help fund development and GPU servers.",
    recommendedDonationUsd: 5,
    primaryBtcWallet: PRIMARY_BTC_WALLET,
    message:
      "A $5 donation is hugely appreciated to help develop new features and improve VelvetMotion, and enters you on the Top Donators Leaderboard to win prizes directly from the owner!",
    tiers: DONATION_TIERS,
    cryptoWallets: CRYPTO_WALLETS,
    ownerPrizes: OWNER_PRIZES,
    leaderboard,
    freeRefillCoins: 500,
  });
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("api-wallet", req, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "pledge";
    const tierId = typeof body.tierId === "string" ? body.tierId : "dev-boost-5";
    const tier = DONATION_TIERS.find((t) => t.id === tierId) || DONATION_TIERS[1];

    if (action === "free-refill") {
      return NextResponse.json({
        ok: true,
        action: "free-refill",
        grantedCoins: 500,
        note: "Granted +500 free coins. No donation required!",
      });
    }

    if (action === "verify-btc") {
      const txid = typeof body.txid === "string" ? body.txid.trim().toLowerCase() : "";
      if (!/^[0-9a-f]{64}$/.test(txid)) {
        return NextResponse.json(
          { ok: false, error: "Invalid Bitcoin TXID (must be a 64-character hexadecimal transaction hash)." },
          { status: 400 },
        );
      }
      try {
        const res = await fetch(`https://mempool.space/api/tx/${txid}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          return NextResponse.json(
            { ok: false, error: `Transaction not found on mempool.space yet (HTTP ${res.status}).` },
            { status: 404 },
          );
        }
        const tx = (await res.json()) as {
          status?: { confirmed?: boolean };
          vout?: Array<{ scriptpubkey_address?: string; value?: number }>;
        };
        const sats = (tx.vout || [])
          .filter((o) => o.scriptpubkey_address === PRIMARY_BTC_WALLET)
          .reduce((sum, o) => sum + (Number(o.value) || 0), 0);
        if (sats <= 0) {
          return NextResponse.json(
            {
              ok: false,
              error: `Transaction found, but no output paid ${PRIMARY_BTC_WALLET}.`,
            },
            { status: 400 },
          );
        }
        return NextResponse.json({
          ok: true,
          action: "verify-btc",
          verified: true,
          confirmed: Boolean(tx.status?.confirmed),
          txid,
          satsReceived: sats,
          btcReceived: Number((sats / 1e8).toFixed(8)),
          grantedCoins: sats >= 15000 ? 12000 : 3500,
          note: `On-chain Bitcoin donation verified (${sats.toLocaleString()} sats → ${PRIMARY_BTC_WALLET})!`,
        });
      } catch {
        return NextResponse.json(
          { ok: false, error: "Could not reach mempool.space right now. Try again in a moment." },
          { status: 502 },
        );
      }
    }

    const username =
      sanitizeUserText(typeof body.username === "string" ? body.username : "", 32) ||
      "VelvetSupporter";
    const contactHandle = sanitizeUserText(
      typeof body.contactHandle === "string" ? body.contactHandle : "",
      64,
    );
    const favoriteGirl =
      sanitizeUserText(typeof body.favoriteGirl === "string" ? body.favoriteGirl : "", 32) ||
      "Maren";
    const safety = checkContentSafety(`${username} ${contactHandle} ${favoriteGirl}`);
    if (!safety.allowed) {
      return NextResponse.json({ error: safety.reason, blocked: true }, { status: 400 });
    }

    const idx = serverLeaderboardEntries.findIndex(
      (e) => e.username.toLowerCase() === username.toLowerCase(),
    );

    if (idx >= 0) {
      const current = serverLeaderboardEntries[idx];
      const nextTotalUsd = current.totalUsd + tier.amountUsd;
      const nextCount = current.donationCount + 1;
      serverLeaderboardEntries[idx] = {
        ...current,
        username,
        contactHandle: contactHandle || current.contactHandle,
        favoriteGirl: favoriteGirl || current.favoriteGirl,
        totalUsd: nextTotalUsd,
        donationCount: nextCount,
        tierTitle: computeTierTitle(nextTotalUsd, nextCount),
        prizeStatus: computePrizeStatus(nextTotalUsd, nextCount),
        lastDonatedAt: Date.now(),
      };
    } else {
      serverLeaderboardEntries.push({
        username,
        contactHandle,
        totalUsd: tier.amountUsd,
        donationCount: 1,
        favoriteGirl,
        tierTitle: computeTierTitle(tier.amountUsd, 1),
        prizeStatus: computePrizeStatus(tier.amountUsd, 1),
        lastDonatedAt: Date.now(),
      });
    }

    const leaderboard = buildRankedLeaderboard(serverLeaderboardEntries);
    const userRank = leaderboard.find(
      (e) => e.username.toLowerCase() === username.toLowerCase(),
    );

    return NextResponse.json({
      ok: true,
      action: "supporter-bonus",
      tier,
      grantedCoins: tier.bonusCoins,
      userRank,
      leaderboard,
      ownerPrizes: OWNER_PRIZES,
      note: `Thank you so much for supporting VelvetMotion development ($${tier.amountUsd})! +${tier.bonusCoins} bonus coins unlocked & Leaderboard Rank #${userRank?.rank ?? 1} updated.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid wallet request" }, { status: 400 });
  }
}
