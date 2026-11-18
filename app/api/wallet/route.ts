import { NextResponse } from "next/server";
import { CRYPTO_WALLETS, DONATION_TIERS, PRIMARY_BTC_WALLET } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "velvetmotion-coin-wallet",
    policy: "100% free forever — donations are completely optional to help fund development and GPU servers.",
    recommendedDonationUsd: 5,
    primaryBtcWallet: PRIMARY_BTC_WALLET,
    message:
      "A $5 donation is hugely appreciated to help develop new features and improve VelvetMotion, but never required.",
    tiers: DONATION_TIERS,
    cryptoWallets: CRYPTO_WALLETS,
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

    return NextResponse.json({
      ok: true,
      action: "supporter-bonus",
      tier,
      grantedCoins: tier.bonusCoins,
      note: `Thank you so much for supporting VelvetMotion development ($${tier.amountUsd})! +${tier.bonusCoins} bonus coins unlocked.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid wallet request" }, { status: 400 });
  }
}
