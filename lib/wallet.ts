/**
 * VelvetMotion Coin Wallet & Optional Community Support / Donation System
 *
 * 100% optional: users get free daily coins and free instant refills anytime.
 * Donations (like a $5 dev boost) help fund development, servers, and GPU workers.
 */

import { addCoins, getCoins } from "./storage";

export interface DonationTier {
  id: string;
  amountUsd: number;
  label: string;
  badge: string;
  bonusCoins: number;
  description: string;
  featured?: boolean;
}

export interface CryptoWalletAddress {
  symbol: "BTC" | "ETH" | "SOL" | "USDT";
  network: string;
  address: string;
}

export interface WalletTransaction {
  id: string;
  type: "free-refill" | "daily-claim" | "supporter-bonus" | "login-gift";
  amount: number;
  label: string;
  at: number;
}

const TX_KEY = "vm-wallet-tx";
const SUPPORTER_KEY = "vm-wallet-supporter";
const PROMPT_LAST_KEY = "vm-support-prompt-last";
const PROMPT_COUNT_KEY = "vm-support-login-count";
const CUSTOM_DONATE_URL_KEY = "vm-custom-donate-url";

export const DONATION_TIERS: DonationTier[] = [
  {
    id: "coffee-3",
    amountUsd: 3,
    label: "Late-Night Espresso",
    badge: "+1,500 Coins",
    bonusCoins: 1500,
    description: "Fuels late-night coding sessions and bug fixes.",
  },
  {
    id: "dev-boost-5",
    amountUsd: 5,
    label: "$5 Developer Boost",
    badge: "Most Appreciated ★ +3,500 Coins",
    bonusCoins: 3500,
    description:
      "$5 is hugely appreciated to help develop new features, faster NSFW image/video models, and keep VelvetMotion 100% free.",
    featured: true,
  },
  {
    id: "gpu-patron-15",
    amountUsd: 15,
    label: "GPU & Video Server Patron",
    badge: "VIP Supporter +12,000 Coins",
    bonusCoins: 12000,
    description: "Helps fund dedicated ComfyUI / img2vid GPU workers and new companion packs.",
  },
];

export const CRYPTO_WALLETS: CryptoWalletAddress[] = [
  {
    symbol: "BTC",
    network: "Bitcoin",
    address: process.env.NEXT_PUBLIC_BTC_WALLET || "bc1qvelvetmotiondevsupport0000000000000000",
  },
  {
    symbol: "ETH",
    network: "Ethereum / Base / Arbitrum (ERC-20)",
    address: process.env.NEXT_PUBLIC_ETH_WALLET || "0x71C95911E9a5D330f4D621842EC243EE1343292e",
  },
  {
    symbol: "SOL",
    network: "Solana",
    address: process.env.NEXT_PUBLIC_SOL_WALLET || "Velvet7x9K2mPqR8vL4nW3cT6yH1jF5dG9sA2bE4uKm",
  },
  {
    symbol: "USDT",
    network: "USDT (ERC-20 / Polygon)",
    address: process.env.NEXT_PUBLIC_USDT_WALLET || "0x71C95911E9a5D330f4D621842EC243EE1343292e",
  },
];

export function getDonationUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(CUSTOM_DONATE_URL_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch {
      /* ignore */
    }
  }
  return (
    process.env.NEXT_PUBLIC_DONATION_URL ||
    "https://ko-fi.com"
  );
}

export function setDonationUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_DONATE_URL_KEY, url.trim());
  } catch {
    /* ignore */
  }
}

export function isSupporter(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SUPPORTER_KEY) === "true";
  } catch {
    return false;
  }
}

export function loadWalletTransactions(): WalletTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordTransaction(
  type: WalletTransaction["type"],
  amount: number,
  label: string,
): WalletTransaction {
  const tx: WalletTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    amount,
    label,
    at: Date.now(),
  };
  if (typeof window !== "undefined") {
    try {
      const next = [tx, ...loadWalletTransactions()].slice(0, 40);
      localStorage.setItem(TX_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return tx;
}

/** Free instant coin top-up so users never have to pay to use VelvetMotion. */
export function claimFreeWalletRefill(amount = 500): { balance: number; tx: WalletTransaction } {
  addCoins(amount);
  const tx = recordTransaction("free-refill", amount, "Free Coin Wallet Refill (No donation required)");
  return { balance: getCoins(), tx };
}

/** Claim thank-you bonus coins & supporter badge when supporting the project. */
export function claimSupporterBonus(tierId = "dev-boost-5"): {
  balance: number;
  tier: DonationTier;
  tx: WalletTransaction;
} {
  const tier = DONATION_TIERS.find((t) => t.id === tierId) || DONATION_TIERS[1];
  addCoins(tier.bonusCoins);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SUPPORTER_KEY, "true");
    } catch {
      /* ignore */
    }
  }
  const tx = recordTransaction(
    "supporter-bonus",
    tier.bonusCoins,
    `Supporter Thank-You Bonus (${tier.label} · $${tier.amountUsd})`,
  );
  return { balance: getCoins(), tier, tx };
}

/**
 * Decides whether to show the friendly, optional "$5 appreciated" support prompt on login.
 * Shows on first login and periodically (every other login or after 3 hours), never blocking.
 */
export function shouldShowSupportPromptOnLogin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const count = parseInt(localStorage.getItem(PROMPT_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(PROMPT_COUNT_KEY, String(count));
    const last = parseInt(localStorage.getItem(PROMPT_LAST_KEY) || "0", 10);
    const threeHoursMs = 3 * 60 * 60 * 1000;
    if (count === 1 || count % 2 === 0 || Date.now() - last > threeHoursMs) {
      localStorage.setItem(PROMPT_LAST_KEY, String(Date.now()));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function dismissSupportPrompt(withFreeGift = false): number {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PROMPT_LAST_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }
  if (withFreeGift) {
    addCoins(250);
    recordTransaction("login-gift", 250, "Welcome Free Login Gift (+250 coins)");
  }
  return getCoins();
}
