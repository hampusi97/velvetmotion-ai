"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "home", href: "/", label: "Explore", icon: "🏠" },
  { id: "discover", href: "/discover/", label: "Discover", icon: "🔥" },
  { id: "create", href: "/create/", label: "Create", icon: "✨" },
  { id: "chat", href: "/chat/", label: "Chat", icon: "💬" },
  { id: "shorts", href: "/shorts/", label: "Shorts", icon: "🎬" },
] as const;

export function MobileBottomNav({
  active,
}: {
  active?: string;
  onNavigate?: (id: string) => void;
}) {
  const pathname = usePathname() || "/";
  const clean = pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/[0.08] bg-[#141418]/95 backdrop-blur-xl pb-[max(0.4rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/"
              ? clean === "/" && (!active || active === "home")
              : clean.startsWith(tab.href) || active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[52px] min-w-[56px] py-1.5 text-[10px] font-semibold transition active:scale-95",
                isActive ? "text-[#ff5678]" : "text-zinc-400",
              )}
            >
              <span className="text-[1.25rem] leading-none">{tab.icon}</span>
              <span className="leading-none">{tab.label}</span>
              {isActive && (
                <span className="h-0.5 w-6 rounded-full bg-[#ff5678] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
