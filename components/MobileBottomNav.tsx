"use client";

import { cn } from "@/lib/cn";

/** Five primary thumbs zones — vault/wallet live under My Girls / Home menus */
const TABS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "tinder", label: "Explore", icon: "🔥" },
  { id: "create", label: "Create", icon: "✨" },
  { id: "girls", label: "Chats", icon: "💬" },
  { id: "joi3d", label: "3D", icon: "🎬" },
] as const;

export function MobileBottomNav({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  const mapped =
    active === "chat" || active === "profile"
      ? "girls"
      : active === "gallery" || active === "tribute" || active === "my-girls" || active === "vault"
        ? "girls"
        : active === "shorts" || active === "blindfold" || active === "room"
          ? "joi3d"
          : active;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/10 bg-zinc-950/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1">
        {TABS.map((tab) => {
          const isActive = mapped === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[52px] min-w-[56px] py-2 text-[10px] font-medium transition active:scale-95",
                isActive ? "text-pink-300" : "text-zinc-500",
              )}
            >
              <span className="text-[1.35rem] leading-none">{tab.icon}</span>
              <span className="leading-none">{tab.label}</span>
              {isActive && <span className="h-0.5 w-6 rounded-full bg-pink-500 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
