"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Tab = "terms" | "privacy" | "safety";

const TABS: { id: Tab; label: string }[] = [
  { id: "terms", label: "Terms" },
  { id: "privacy", label: "Privacy" },
  { id: "safety", label: "Safety & 18+" },
];

export function LegalPages({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<Tab>("safety");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back
          </button>
        )}
        <h1 className="text-2xl font-semibold text-white">Legal & Safety</h1>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition",
              tab === t.id
                ? "bg-pink-600/20 text-pink-200 border border-pink-500/40"
                : "text-zinc-400 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="prose prose-invert prose-sm max-w-none text-zinc-300 space-y-4 leading-relaxed">
        {tab === "safety" && (
          <>
            <h2 className="text-lg text-white font-semibold">18+ Fictional AI only</h2>
            <p>
              VelvetMotion is an adult entertainment product. All characters are fictional AI personas.
              You must be 18 or older to use this app. By continuing you confirm you are of legal age
              in your jurisdiction.
            </p>
            <p>
              Content can be explicit, including JOI, SPH, BNWO, and other adult fantasies. Nothing here
              depicts real people, and nothing is intended as advice, encouragement, or instruction for
              real-world harm.
            </p>
            <p>
              If you feel distressed, stop using the app and seek real-world support (e.g. local crisis
              lines). This is fiction for consenting adults.
            </p>
          </>
        )}
        {tab === "terms" && (
          <>
            <h2 className="text-lg text-white font-semibold">Terms of use</h2>
            <p>
              VelvetMotion is provided free of charge, as-is, with no warranty. Features may change or
              break. We do not sell access, subscriptions, or coins — generation costs are virtual and
              local to your device where possible.
            </p>
            <p>
              You agree not to use the service to create or share illegal content, including any sexual
              content involving minors (fictional or otherwise). Violations may result in access being
              blocked.
            </p>
            <p>
              Optional cloud sync (Firebase) is available when you sign in; core chat and media still
              work offline via localStorage.
            </p>
          </>
        )}
        {tab === "privacy" && (
          <>
            <h2 className="text-lg text-white font-semibold">Privacy</h2>
            <p>
              By default, chats, coins, gallery items, and intimacy scores stay on your device
              (localStorage). We do not require an account for the free experience.
            </p>
            <p>
              If you choose to sign in, limited data (profile, optional chat sync, lounge messages) may
              be stored in Firebase under your UID. You can clear local data anytime from browser
              settings or by wiping site data.
            </p>
            <p>
              Image generation may call third-party image APIs (e.g. Pollinations). Do not put personal
              real-world identifying information into prompts you want to keep private.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
