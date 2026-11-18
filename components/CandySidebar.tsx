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
  { id: "girls", label: "Chat Roster", emoji: "💬" },
  { id: "romance", label: "Romance Mode", emoji: "💕" },
  { id: "tinder", label: "Discover Swipe", emoji: "🔥" },
  { id: "penthouse", label: "3D Penthouse", emoji: "🏙️" },
  { id: "scenario", label: "Spicy Scenarios", emoji: "🎭" },
  { id: "blindfold", label: "Blindfold JOI", emoji: "🕶️" },
  { id: "room", label: "Goon Room", emoji: "⏱️" },
  { id: "roulette", label: "Roulette Sprint", emoji: "🎰" },
  { id: "dual", label: "Dual Girl Chat", emoji: "👯‍♀️" },
  { id: "group", label: "Group Chat", emoji: "👥" },
  { id: "lounge", label: "User Lounge", emoji: "👋" },
  { id: "joi", label: "Guided JOI", emoji: "🎧" },
  { id: "packs", label: "Story Packs", emoji: "📖" },
  { id: "bnwo", label: "Power Dynamics", emoji: "👑" },
  { id: "tribute", label: "Tribute Hub", emoji: "🔒" },
  { id: "gallery", label: "Collection", emoji: "🖼️" },
  { id: "vault", label: "Private Vault", emoji: "🔐" },
  { id: "create", label: "Create Character", emoji: "✨" },
  { id: "import", label: "Import Card", emoji: "🃏" },
  { id: "share", label: "Share & Codes", emoji: "🔗" },
  { id: "workspace", label: "Google Workspace", emoji: "☁️" },
  { id: "advanced", label: "Advanced & Comfy", emoji: "⚙️" },
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
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/10 bg-zinc-950/80 py-4 px-3 sticky top-16 h-[calc(100dvh-4rem)]">
      <nav className="flex flex-col gap-0.5 overflow-y-auto pr-1">
        {ITEMS.map((item) => {
          const isActive = active === item.id || (item.id === "girls" && active === "chat");
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
          <div className="text-xs text-amber-200 px-3">{coins} coins</div>
        )}
        <button
          type="button"
          onClick={() => onNavigate("tribute")}
          className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-2.5 text-sm font-semibold text-white"
        >
          💎 Premium vibes
        </button>
      </div>
    </aside>
  );
}
