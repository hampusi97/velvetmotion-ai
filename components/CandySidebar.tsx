"use client";

import { cn } from "@/lib/cn";

type NavItem = {
  id: string;
  label: string;
  emoji?: string;
  badge?: string;
};

const ITEMS: NavItem[] = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "shorts", label: "Shorts", emoji: "🎬" },
  { id: "my-girls", label: "My Girls", emoji: "💗" },
  { id: "girls", label: "Chat", emoji: "💬" },
  { id: "gallery", label: "Collection", emoji: "🖼️" },
  { id: "create", label: "Create Character", emoji: "✨" },
  { id: "import", label: "Import card", emoji: "🃏" },
  { id: "tinder", label: "Discover", emoji: "🔥" },
  { id: "lounge", label: "Lounge", emoji: "👋" },
  { id: "group", label: "Group chat", emoji: "👥" },
  { id: "tribute", label: "Private Content", emoji: "🔒" },
  { id: "vault", label: "Private Vault", emoji: "🔐" },
  { id: "wallet", label: "Coin Wallet & Support", emoji: "🪙", badge: "$5 ❤" },
  { id: "advanced", label: "Advanced media", emoji: "⚙️" },
  { id: "safety", label: "Legal & Safety", emoji: "📋" },
];

export function CandySidebar({
  active,
  onNavigate,
  coins,
}: {
  active: string;
  onNavigate: (id: string) => void;
  coins?: number;
}) {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/10 bg-zinc-950/80 py-4 px-3 sticky top-16 h-[calc(100dvh-4rem)]">
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const isActive =
            active === item.id ||
            (item.id === "girls" && active === "chat") ||
            (item.id === "safety" &&
              (active === "terms" || active === "privacy" || active === "safety" || active === "legal"));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition",
                isActive
                  ? "bg-zinc-800 text-white border border-pink-500/30"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="text-base w-5 text-center">{item.emoji}</span>
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] rounded-full bg-pink-600 px-1.5 py-0.5 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/10 space-y-2">
        {typeof coins === "number" && (
          <button
            type="button"
            onClick={() => onNavigate("wallet")}
            className="w-full flex items-center justify-between text-xs text-amber-200 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition"
          >
            <span>🪙 {coins.toLocaleString()} coins</span>
            <span className="text-[10px] text-amber-300/80">Wallet →</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onNavigate("wallet")}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-fuchsia-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:opacity-95 transition"
        >
          💝 Support Dev ($5)
        </button>
      </div>
    </aside>
  );
}
