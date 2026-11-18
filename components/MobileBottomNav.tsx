"use client";

import { cn } from "@/lib/cn";

const TABS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "shorts", label: "Shorts", icon: "🎬" },
  { id: "create", label: "Create", icon: "✨" },
  { id: "my-girls", label: "My Girls", icon: "💗" },
  { id: "girls", label: "Chat", icon: "💬" },
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
      : active === "gallery" || active === "tribute"
        ? "my-girls"
        : active;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/10 bg-zinc-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive = mapped === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition",
                isActive ? "text-pink-300" : "text-zinc-500",
              )}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && <span className="h-0.5 w-6 rounded-full bg-pink-500 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
