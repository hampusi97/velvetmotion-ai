"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCoinsStore } from "@/lib/coinsStore";
import { cn } from "@/lib/cn";

type NavItem = {
  id: string;
  href: string;
  label: string;
  emoji: string;
  badge?: string;
};

const ITEMS: NavItem[] = [
  { id: "home", href: "/", label: "Home / Explore", emoji: "🏠" },
  { id: "discover", href: "/discover/", label: "Discover", emoji: "🔥" },
  { id: "chat", href: "/chat/", label: "Chat", emoji: "💬" },
  { id: "group", href: "/group/", label: "Group chat", emoji: "👥" },
  { id: "shorts", href: "/shorts/", label: "Shorts", emoji: "🎬" },
  { id: "collection", href: "/collection/", label: "Collection", emoji: "🖼️" },
  { id: "private", href: "/private/", label: "Private Content", emoji: "🔒" },
  { id: "create", href: "/create/", label: "Create Character", emoji: "✨" },
  { id: "studio", href: "/studio/", label: "Media Studio", emoji: "🎨" },
  { id: "download", href: "/download/", label: "Desktop App", emoji: "💻", badge: "⚡ ULTRA" },
];

function isRouteActive(pathname: string, active: string | undefined, item: NavItem): boolean {
  const clean = pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
  if (item.href === "/") {
    return clean === "/" && (!active || active === "home");
  }
  return clean.startsWith(item.href) || active === item.id;
}

export function CandySidebar({
  active,
  onNavigate,
  onOpenSettings,
}: {
  active?: string;
  onNavigate?: (id: string) => void;
  coins?: number;
  onOpenSettings?: () => void;
}) {
  const pathname = usePathname() || "/";
  const { coins } = useCoinsStore();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#05050a]/90 backdrop-blur-xl py-4 px-3 sticky top-16 h-[calc(100dvh-4rem)]">
      <nav aria-label="Sidebar Navigation" className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1 pr-1">
        {ITEMS.map((item) => {
          const isActive = isRouteActive(pathname, active, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition border",
                isActive
                  ? "border-[#ff1e8e]/70 bg-[#ff1e8e]/15 text-white shadow-[0_0_16px_rgba(255,30,142,0.28)]"
                  : "border-transparent text-[#a6a6c4] hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="text-base w-5 text-center">{item.emoji}</span>
              <span className="font-semibold truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto shrink-0 rounded-full border border-[#00f5ff]/50 bg-[#00f5ff]/15 px-2 py-0.5 text-[9px] font-black text-[#00f5ff]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-2 border-t border-white/10 pt-2 space-y-1">
          <Link
            href="/?view=blindfold"
            onClick={() => onNavigate?.("blindfold")}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#a6a6c4] hover:bg-white/5 hover:text-white"
          >
            <span className="w-5 text-center">🎧</span>
            <span>Blindfold JOI</span>
          </Link>
          <Link
            href="/?view=lounge"
            onClick={() => onNavigate?.("lounge")}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#a6a6c4] hover:bg-white/5 hover:text-white"
          >
            <span className="w-5 text-center">👋</span>
            <span>User Lounge</span>
          </Link>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#a6a6c4] hover:bg-white/5 hover:text-white"
            >
              <span className="w-5 text-center">⚙️</span>
              <span>Settings &amp; Backup</span>
            </button>
          )}
        </div>
      </nav>

      <div className="mt-auto pt-3 border-t border-white/10 space-y-2">
        <Link
          href="/?view=wallet"
          onClick={() => onNavigate?.("wallet")}
          className="w-full flex items-center justify-between text-xs text-amber-200 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition tabular-nums"
        >
          <span>🪙 {coins.toLocaleString()} coins</span>
          <span className="text-[10px] text-amber-300">Wallet →</span>
        </Link>
        <Link
          href="/download/"
          className="block text-center w-full rounded-xl neon-btn-primary py-2.5 text-xs font-extrabold text-white"
        >
          ⚡ Get Desktop Ultra App
        </Link>
      </div>
    </aside>
  );
}
