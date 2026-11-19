import { NextResponse } from "next/server";
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

    const username =
      typeof body.username === "string" && body.username.trim().length > 0
        ? body.username.trim().slice(0, 32)
        : "VelvetSupporter";
    const contactHandle =
      typeof body.contactHandle === "string" ? body.contactHandle.trim().slice(0, 64) : "";
    const favoriteGirl =
      typeof body.favoriteGirl === "string" && body.favoriteGirl.trim().length > 0
        ? body.favoriteGirl.trim().slice(0, 32)
        : "Maren";

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
