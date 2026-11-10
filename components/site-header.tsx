"use client";

import { useEffect, useRef } from "react";
import { containerClass, cn } from "@/lib/cn";
import { sections, type ViewId } from "@/lib/sections";
import { CloseIcon, Mark, MenuIcon } from "./icons";

export function SiteHeader({
  view,
  menuOpen,
  onToggleMenu,
  onNavigate,
}: {
  view: ViewId;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("button");
    first?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, onToggleMenu]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches && menuOpen) onToggleMenu();
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [menuOpen, onToggleMenu]);

  return (
    <div className="sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <header className="border-b border-white/10 bg-ink-950/85 backdrop-blur-md">
        <div className={cn(containerClass, "flex h-16 items-center gap-3")}>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            aria-current={view === "home" ? "page" : undefined}
            className="press inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-full pr-2"
          >
            <Mark className="h-8 w-8" />
            <span className="font-display text-xl tracking-[-0.03em] text-cream">VelvetMotion</span>
          </button>
          <nav aria-label="Sections" className="hidden min-w-0 flex-1 md:block">
            <ul className="flex items-center gap-1 overflow-x-auto px-1 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map((section) => {
                const active = view === section.id;
                return (
                  <li key={section.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(section.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "press inline-flex min-h-11 items-center rounded-full px-3 text-base font-medium",
                        active ? "bg-rose-600 text-white" : "text-mist hover:bg-white/5 hover:text-cream"
                      )}
                    >
                      {section.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <button
            type="button"
            className="press ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-cream md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={onToggleMenu}
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </header>
      {menuOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 md:hidden"
          style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/65"
            onClick={onToggleMenu}
          />
          <nav
            id="mobile-menu"
            ref={panelRef}
            aria-label="Sections"
            role="dialog"
            aria-modal="true"
            className="relative max-h-[calc(100dvh-4rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-b border-white/10 bg-ink-900/95 backdrop-blur-md"
          >
            <ul className="flex flex-col gap-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("home")}
                  aria-current={view === "home" ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-2xl px-3 text-left text-base font-medium",
                    view === "home" ? "bg-rose-600 text-white" : "text-cream hover:bg-white/5"
                  )}
                >
                  Home
                </button>
              </li>
              {sections.map((section) => {
                const active = view === section.id;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(section.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 w-full items-center rounded-2xl px-3 text-left text-base",
                        active ? "bg-rose-600 font-medium text-white" : "text-cream hover:bg-white/5"
                      )}
                    >
                      {section.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
