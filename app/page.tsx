"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HomeView } from "@/components/home-view";
import { SectionView } from "@/components/section-view";
import { SiteHeader } from "@/components/site-header";
import { containerClass } from "@/lib/cn";
import { pageFade } from "@/lib/motion";
import { findSection, type SectionId, type ViewId } from "@/lib/sections";

export default function Home() {
  const [view, setView] = useState<ViewId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const reduce = useReducedMotion();

  const onToggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const onNavigate = useCallback((next: ViewId) => {
    setMenuOpen(false);
    setView(next);
  }, []);

  useEffect(() => {
    const title =
      view === "home" ? "VelvetMotion AI" : `${findSection(view).title} · VelvetMotion`;
    document.title = title;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [view]);

  useEffect(() => {
    const main = document.getElementById("main");
    const footer = document.querySelector("footer");
    if (menuOpen) {
      main?.setAttribute("inert", "");
      footer?.setAttribute("inert", "");
    } else {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    }
  }, [menuOpen]);

  const section = view === "home" ? null : findSection(view);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[max(1rem,env(safe-area-inset-top))] focus:z-[80] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-cream focus:px-4 focus:font-medium focus:text-ink-950"
      >
        Skip to content
      </a>
      <SiteHeader
        view={view}
        menuOpen={menuOpen}
        onToggleMenu={onToggleMenu}
        onNavigate={onNavigate}
      />
      <main
        id="main"
        tabIndex={-1}
        aria-hidden={menuOpen ? true : undefined}
        className={containerClass + " min-w-0 flex-1 outline-none"}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            data-motion
            variants={pageFade}
            initial={reduce ? false : "hidden"}
            animate="show"
            exit={reduce ? { opacity: 1, transition: { duration: 0 } } : "exit"}
          >
            {section ? (
              <SectionView section={section} onHome={() => onNavigate("home")} />
            ) : (
              <HomeView onNavigate={(id: SectionId) => onNavigate(id)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer
        aria-hidden={menuOpen ? true : undefined}
        className="mt-10 border-t border-white/10 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8"
      >
        <div className={containerClass + " space-y-2"}>
          <p className="font-display text-lg text-cream">VelvetMotion</p>
          <p className="max-w-xl text-base leading-relaxed text-mist">
            Fictional characters only. VelvetMotion does not depict real people.
          </p>
          <p className="text-base text-mist">Full features loading... Pull latest.</p>
        </div>
      </footer>
    </div>
  );
}
