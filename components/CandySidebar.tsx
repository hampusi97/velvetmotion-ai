"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  Heart,
  Home,
  Image as ImageIcon,
  Laptop,
  Lock,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { useCoinsStore } from "@/lib/coinsStore";
import { cn } from "@/lib/cn";

type NavItem = {
  id: string;
  href: string;
  label: string;
  badge?: string;
  Icon: typeof Home;
};

const ITEMS: NavItem[] = [
  { id: "home", href: "/", label: "Home", Icon: Home },
  { id: "shorts", href: "/shorts/", label: "Shorts", Icon: Film },
  { id: "chat", href: "/chat/", label: "Chat", Icon: MessageCircle },
  { id: "collection", href: "/collection/", label: "Collection", Icon: ImageIcon },
  { id: "create", href: "/create/", label: "Create Character", Icon: Wand2 },
  { id: "discover", href: "/discover/", label: "Discover", Icon: Heart },
  { id: "private", href: "/private/", label: "Private Content", Icon: Lock },
  { id: "group", href: "/group/", label: "Group Chat", Icon: Users },
  { id: "studio", href: "/studio/", label: "Media Studio", Icon: Sparkles },
  { id: "download", href: "/download/", label: "Desktop App", badge: "ULTRA", Icon: Laptop },
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
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/[0.08] bg-[#141418] py-3.5 px-3 sticky top-14 h-[calc(100dvh-3.5rem)]">
      <nav aria-label="Sidebar Navigation" className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1.5 pr-0.5">
        {ITEMS.map((item) => {
          const isActive = isRouteActive(pathname, active, item);
          const { Icon } = item;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-left transition border",
                isActive
                  ? "border-[#ff5678]/65 bg-[#26171f] text-white shadow-[0_0_14px_rgba(255,86,120,0.16)]"
                  : "border-white/[0.07] bg-[#1b1b20] text-[#b4b4c0] hover:border-white/20 hover:text-white",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#ff5678]" : "text-zinc-400")} />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto shrink-0 rounded-full bg-[#ff5678] px-2 py-0.5 text-[9px] font-extrabold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <Link
          href="/?view=wallet"
          onClick={() => onNavigate?.("wallet")}
          className="mt-1 flex items-center justify-between rounded-xl border border-amber-400/25 bg-gradient-to-r from-[#ff5678]/15 via-[#1b1b20] to-amber-500/10 px-3 py-2 text-[13px] font-semibold text-amber-200 hover:border-[#ff5678]/50 transition"
        >
          <span className="flex items-center gap-2 truncate">
            <span>💖</span> Support Dev
          </span>
          <span className="shrink-0 rounded-full bg-[#ff5678] px-2 py-0.5 text-[9px] font-extrabold text-white">
            $3
          </span>
        </Link>
      </nav>

      <div className="mt-auto pt-3 border-t border-white/[0.08] space-y-1.5">
        <Link
          href="/?view=wallet"
          onClick={() => onNavigate?.("wallet")}
          className="w-full flex items-center justify-between text-xs text-amber-200 px-3 py-2 rounded-xl bg-[#1b1b20] border border-white/[0.08] hover:border-amber-400/40 transition tabular-nums"
        >
          <span>🪙 {coins.toLocaleString()}</span>
          <span className="text-[10px] text-amber-300 font-semibold">Wallet →</span>
        </Link>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#1b1b20] px-3 py-2 text-xs font-medium text-zinc-300 hover:border-white/20 hover:text-white"
          >
            <Settings className="h-3.5 w-3.5 text-zinc-400" />
            <span>Settings &amp; Backup</span>
          </button>
        )}
        <div className="flex items-center justify-center gap-2 pt-1 text-[10px] text-zinc-500">
          <Link href="/terms/" className="hover:text-zinc-300">Legal Terms</Link>
          <span>·</span>
          <Link href="/privacy/" className="hover:text-zinc-300">Privacy</Link>
          <span>·</span>
          <Link href="/policy/" className="hover:text-zinc-300">18+</Link>
        </div>
      </div>
    </aside>
  );
}
