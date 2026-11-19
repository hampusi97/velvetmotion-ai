/**
 * VelvetMotion Coin Wallet, Top Donators Leaderboard & Owner Prize Pool System
 *
 * 100% optional: users get free daily coins and free instant refills anytime.
 * Donations (like a $5 dev boost) help fund development, servers, and GPU workers,
 * and place supporters on the Top Donators Leaderboard where they can win prizes
 * directly from the owner.
 */

import { addCoins, getCoins } from "./storage";
import { getUser } from "./auth";

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
  type: "free-refill" | "daily-claim" | "supporter-bonus" | "login-gift" | "owner-prize";
  amount: number;
  label: string;
  at: number;
}

export interface OwnerPrize {
  id: string;
  rankRequirement: string;
  minUsd: number;
  minDonations: number;
  title: string;
  badge: string;
  rewardFromOwner: string;
  bonusCoins: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  contactHandle?: string;
  totalUsd: number;
  donationCount: number;
  favoriteGirl: string;
  tierTitle: string;
  prizeStatus: string;
  lastDonatedAt: number;
  isCurrentUser?: boolean;
}

export interface UserDonationStats {
  username: string;
  contactHandle: string;
  totalUsd: number;
  donationCount: number;
  favoriteGirl: string;
  unlockedPrizeIds: string[];
}

const TX_KEY = "vm-wallet-tx";
const SUPPORTER_KEY = "vm-wallet-supporter";
const PROMPT_LAST_KEY = "vm-support-prompt-last";
const PROMPT_COUNT_KEY = "vm-support-login-count";
const CUSTOM_DONATE_URL_KEY = "vm-custom-donate-url";
const USER_DONATION_STATS_KEY = "vm-wallet-user-donation-stats";
const LEADERBOARD_CACHE_KEY = "vm-wallet-leaderboard";

export const DONATION_TIERS: DonationTier[] = [
  {
    id: "coffee-3",
    amountUsd: 3,
    label: "Late-Night Espresso",
    badge: "+1,500 Coins · +1 Streak",
    bonusCoins: 1500,
    description: "Fuels late-night coding sessions, climbs the leaderboard, and adds +1 to your Owner Prize streak.",
  },
  {
    id: "dev-boost-5",
    amountUsd: 5,
    label: "$5 Developer Boost",
    badge: "Most Appreciated ★ +3,500 Coins",
    bonusCoins: 3500,
    description:
      "$5 is hugely appreciated to help develop new features, faster NSFW models, and enters you for Owner Prizes on the Leaderboard.",
    featured: true,
  },
  {
    id: "gpu-patron-15",
    amountUsd: 15,
    label: "GPU & Video Server Patron",
    badge: "VIP Whale +12,000 Coins",
    bonusCoins: 12000,
    description:
      "Fast-tracks you toward the Top 3 Donators Podium for custom companions & private 4K renders directly from the owner.",
  },
];

export const OWNER_PRIZES: OwnerPrize[] = [
  {
    id: "prize-streak-mystery",
    rankRequirement: "Top 10 or 2+ Donations ($5+)",
    minUsd: 5,
    minDonations: 2,
    title: "🎁 Owner Mystery Drop & VIP Raffle Ticket",
    badge: "Direct From Owner",
    rewardFromOwner:
      "Entered into the Owner's direct prize drop (crypto/gift rewards, secret fantasy codes, early unreleased companions & +5,000 bonus coins).",
    bonusCoins: 5000,
  },
  {
    id: "prize-top3-render",
    rankRequirement: "Top 3 Donators or $25+ Total",
    minUsd: 25,
    minDonations: 3,
    title: "🥈 Private 4K Uncensored Video Pack & Custom JOI",
    badge: "Top 3 VIP Prize",
    rewardFromOwner:
      "The owner personally renders a custom uncensored ComfyUI 4K video loop pack + custom name-whispered JOI scenario for your favorite girl.",
    bonusCoins: 15000,
  },
  {
    id: "prize-rank1-dreamgirl",
    rankRequirement: "#1 Top Donator or $50+ Legend",
    minUsd: 50,
    minDonations: 5,
    title: "👑 Custom Dream Companion Built By The Owner",
    badge: "#1 Grand Prize",
    rewardFromOwner:
      "The owner personally builds & publishes your custom dream companion (face lock, outfits, voice, kinks & story pack) + direct VIP owner contact & 50,000 coins.",
    bonusCoins: 50000,
  },
];

export const DEFAULT_LEADERBOARD: Omit<LeaderboardEntry, "rank">[] = [
  {
    username: "MidnightWhale_99",
    contactHandle: "@midnight_vip",
    totalUsd: 65,
    donationCount: 7,
    favoriteGirl: "Maren",
    tierTitle: "👑 #1 Grand Patron",
    prizeStatus: "Won Custom Dream Girl from Owner",
    lastDonatedAt: Date.now() - 1000 * 60 * 35,
  },
  {
    username: "VelvetKing_XO",
    contactHandle: "@velvetking",
    totalUsd: 40,
    donationCount: 5,
    favoriteGirl: "Sable",
    tierTitle: "🥈 Diamond Donator",
    prizeStatus: "Eligible: Private 4K Render Pack",
    lastDonatedAt: Date.now() - 1000 * 60 * 110,
  },
  {
    username: "CryptoDaddy_BTC",
    contactHandle: "@cryptodaddy",
    totalUsd: 25,
    donationCount: 4,
    favoriteGirl: "Valentina",
    tierTitle: "🥉 Gold Supporter",
    prizeStatus: "Eligible: Top 3 VIP Prize Drop",
    lastDonatedAt: Date.now() - 1000 * 60 * 240,
  },
  {
    username: "LioraObsessed",
    contactHandle: "@liora_fan",
    totalUsd: 15,
    donationCount: 3,
    favoriteGirl: "Liora",
    tierTitle: "🔥 3x Streak VIP",
    prizeStatus: "Entered: Owner Mystery Prize Drop",
    lastDonatedAt: Date.now() - 1000 * 60 * 400,
  },
  {
    username: "NeonGooner77",
    contactHandle: "@neongoon",
    totalUsd: 10,
    donationCount: 2,
    favoriteGirl: "Yuki",
    tierTitle: "💖 2x Repeat Supporter",
    prizeStatus: "Entered: Owner Mystery Prize Drop",
    lastDonatedAt: Date.now() - 1000 * 60 * 720,
  },
  {
    username: "BoudoirRider",
    contactHandle: "@boudoir",
    totalUsd: 5,
    donationCount: 1,
    favoriteGirl: "Chloe",
    tierTitle: "★ $5 Dev Booster",
    prizeStatus: "1 donation away from Mystery Drop",
    lastDonatedAt: Date.now() - 1000 * 60 * 1200,
  },
];

export const PRIMARY_BTC_WALLET = "bc1qjmf9u3cmrn59q5nqmzgkvrgy7exegnfmph999k";

export const CRYPTO_WALLETS: CryptoWalletAddress[] = [
  {
    symbol: "BTC",
    network: "Bitcoin (Native SegWit)",
    address: process.env.NEXT_PUBLIC_BTC_WALLET || PRIMARY_BTC_WALLET,
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

export function computeTierTitle(totalUsd: number, donationCount: number): string {
  if (totalUsd >= 50 || donationCount >= 6) return "👑 Grand Patron Legend";
  if (totalUsd >= 25 || donationCount >= 4) return "💎 Diamond VIP Streak";
  if (totalUsd >= 15 || donationCount >= 3) return "🔥 3x+ Streak Contender";
  if (totalUsd >= 10 || donationCount >= 2) return "💖 Repeat Dev Booster";
  if (totalUsd >= 5) return "★ $5 Dev Supporter";
  return "🪙 Supporter";
}

export function computePrizeStatus(totalUsd: number, donationCount: number, rank?: number): string {
  if (rank === 1 || totalUsd >= 50) return "👑 Eligible: Owner Custom Dream Girl + 4K Pack";
  if ((rank && rank <= 3) || totalUsd >= 25) return "🥈 Eligible: Owner 4K Render Pack + Mystery Drop";
  if (donationCount >= 2 || totalUsd >= 10) return "🎁 Entered: Owner Mystery Prize Drop";
  if (totalUsd >= 5) return "★ 1 more donation unlocks Owner Mystery Drop";
  return "Donate $5 to enter the Owner Prize Pool";
}

export function getMyDonationStats(): UserDonationStats {
  const defaultName = getUser()?.username || "You";
  if (typeof window === "undefined") {
    return {
      username: defaultName,
      contactHandle: "",
      totalUsd: 0,
      donationCount: 0,
      favoriteGirl: "Maren",
      unlockedPrizeIds: [],
    };
  }
  try {
    const raw = localStorage.getItem(USER_DONATION_STATS_KEY);
    if (!raw) {
      return {
        username: defaultName,
        contactHandle: "",
        totalUsd: 0,
        donationCount: 0,
        favoriteGirl: "Maren",
        unlockedPrizeIds: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<UserDonationStats>;
    return {
      username: parsed.username || defaultName,
      contactHandle: parsed.contactHandle || "",
      totalUsd: typeof parsed.totalUsd === "number" ? parsed.totalUsd : 0,
      donationCount: typeof parsed.donationCount === "number" ? parsed.donationCount : 0,
      favoriteGirl: parsed.favoriteGirl || "Maren",
      unlockedPrizeIds: Array.isArray(parsed.unlockedPrizeIds) ? parsed.unlockedPrizeIds : [],
    };
  } catch {
    return {
      username: defaultName,
      contactHandle: "",
      totalUsd: 0,
      donationCount: 0,
      favoriteGirl: "Maren",
      unlockedPrizeIds: [],
    };
  }
}

export function saveMyDonationProfile(patch: Partial<Pick<UserDonationStats, "username" | "contactHandle" | "favoriteGirl">>): UserDonationStats {
  const current = getMyDonationStats();
  const next: UserDonationStats = {
    ...current,
    username: (patch.username ?? current.username).trim().slice(0, 32) || current.username,
    contactHandle: (patch.contactHandle ?? current.contactHandle).trim().slice(0, 64),
    favoriteGirl: (patch.favoriteGirl ?? current.favoriteGirl).trim().slice(0, 32) || "Maren",
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(USER_DONATION_STATS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function buildRankedLeaderboard(
  entries: Omit<LeaderboardEntry, "rank">[],
  currentUserStats?: UserDonationStats,
): LeaderboardEntry[] {
  const map = new Map<string, Omit<LeaderboardEntry, "rank">>();
  for (const item of entries) {
    map.set(item.username.toLowerCase(), { ...item });
  }
  if (currentUserStats && currentUserStats.totalUsd > 0) {
    const key = currentUserStats.username.toLowerCase();
    const existing = map.get(key);
    const totalUsd = Math.max(currentUserStats.totalUsd, existing?.totalUsd ?? 0);
    const donationCount = Math.max(currentUserStats.donationCount, existing?.donationCount ?? 0);
    map.set(key, {
      username: currentUserStats.username,
      contactHandle: currentUserStats.contactHandle || existing?.contactHandle,
      totalUsd,
      donationCount,
      favoriteGirl: currentUserStats.favoriteGirl || existing?.favoriteGirl || "Maren",
      tierTitle: computeTierTitle(totalUsd, donationCount),
      prizeStatus: computePrizeStatus(totalUsd, donationCount),
      lastDonatedAt: Date.now(),
      isCurrentUser: true,
    });
  }
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.totalUsd !== a.totalUsd) return b.totalUsd - a.totalUsd;
    if (b.donationCount !== a.donationCount) return b.donationCount - a.donationCount;
    return b.lastDonatedAt - a.lastDonatedAt;
  });

  return sorted.map((entry, idx) => {
    const rank = idx + 1;
    return {
      ...entry,
      rank,
      prizeStatus: computePrizeStatus(entry.totalUsd, entry.donationCount, rank),
    };
  });
}

export function loadLeaderboard(): LeaderboardEntry[] {
  const myStats = getMyDonationStats();
  if (typeof window === "undefined") {
    return buildRankedLeaderboard(DEFAULT_LEADERBOARD);
  }
  try {
    const raw = localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return buildRankedLeaderboard(parsed, myStats);
      }
    }
  } catch {
    /* ignore */
  }
  return buildRankedLeaderboard(DEFAULT_LEADERBOARD, myStats);
}

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
    `bitcoin:${PRIMARY_BTC_WALLET}?label=VelvetMotion%20AI%20Support`
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

/**
 * Claim thank-you bonus coins, increment Top Donators Leaderboard rank & streak,
 * and unlock Owner Prizes when supporting the project.
 */
export function claimSupporterBonus(tierId = "dev-boost-5"): {
  balance: number;
  tier: DonationTier;
  tx: WalletTransaction;
  stats: UserDonationStats;
  newlyUnlockedPrizes: OwnerPrize[];
  leaderboard: LeaderboardEntry[];
} {
  const tier = DONATION_TIERS.find((t) => t.id === tierId) || DONATION_TIERS[1];
  addCoins(tier.bonusCoins);

  const prevStats = getMyDonationStats();
  const nextTotalUsd = prevStats.totalUsd + tier.amountUsd;
  const nextCount = prevStats.donationCount + 1;

  const newlyUnlockedPrizes: OwnerPrize[] = [];
  const nextUnlockedIds = [...prevStats.unlockedPrizeIds];

  for (const prize of OWNER_PRIZES) {
    if (
      !nextUnlockedIds.includes(prize.id) &&
      (nextTotalUsd >= prize.minUsd || nextCount >= prize.minDonations)
    ) {
      nextUnlockedIds.push(prize.id);
      newlyUnlockedPrizes.push(prize);
      addCoins(prize.bonusCoins);
      recordTransaction(
        "owner-prize",
        prize.bonusCoins,
        `🏆 Unlocked Owner Prize Milestone: ${prize.title} (+${prize.bonusCoins.toLocaleString()} bonus coins)`,
      );
    }
  }

  const nextStats: UserDonationStats = {
    ...prevStats,
    totalUsd: nextTotalUsd,
    donationCount: nextCount,
    unlockedPrizeIds: nextUnlockedIds,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SUPPORTER_KEY, "true");
      localStorage.setItem(USER_DONATION_STATS_KEY, JSON.stringify(nextStats));
    } catch {
      /* ignore */
    }
  }

  const tx = recordTransaction(
    "supporter-bonus",
    tier.bonusCoins,
    `Supporter Thank-You Bonus (${tier.label} · $${tier.amountUsd} · Streak #${nextCount})`,
  );

  const leaderboard = buildRankedLeaderboard(loadLeaderboard(), nextStats);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(leaderboard));
    } catch {
      /* ignore */
    }
    // Sync donation asynchronously to server `/api/wallet` leaderboard
    if (typeof fetch !== "undefined") {
      void fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "supporter-bonus",
          tierId: tier.id,
          username: nextStats.username,
          contactHandle: nextStats.contactHandle,
          favoriteGirl: nextStats.favoriteGirl,
        }),
      }).catch(() => {});
    }
  }

  return {
    balance: getCoins(),
    tier,
    tx,
    stats: nextStats,
    newlyUnlockedPrizes,
    leaderboard,
  };
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
