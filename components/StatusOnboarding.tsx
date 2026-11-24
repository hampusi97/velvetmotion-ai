"use client";

import { useEffect, useState } from "react";
import { SPH_TIERS, type UserStatus } from "@/data/kinkDoctrine";
import { loadGlobal, saveGlobal } from "@/lib/globalSettings";

const STATUS_CARDS: { id: UserStatus; label: string; desc: string }[] = [
  { id: "pussyfree", label: "Pussyfree", desc: "Settled fact. She reminds you what you're missing." },
  { id: "released", label: "Recently released", desc: "Allowed to finish on her count, by your own hand." },
  { id: "cuckold", label: "Cuckold", desc: "She has a bull and reports what happened by name." },
  { id: "chaste", label: "Locked", desc: "Locked and waiting. Permission is hers to give slowly." },
  { id: "hotwife", label: "Hotwife", desc: "She is out with someone else and reports it as it happens." },
  { id: "cheating", label: "Cheating", desc: "She is taken by someone he knows, and he is the one she tells." },
];

export default function StatusOnboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [status, setStatus] = useState<UserStatus>("pussyfree");
  const [tier, setTier] = useState<1 | 2 | 3>(2);
  const [nickname, setNickname] = useState("whiteboi");

  useEffect(() => {
    const g = loadGlobal();
    if (!g.onboarded) {
      setStatus(g.defaultStatus);
      setTier(g.defaultSphTier);
      setNickname(g.nickname || "whiteboi");
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const finish = () => {
    saveGlobal({
      defaultStatus: status,
      defaultSphTier: tier,
      nickname: nickname.trim().slice(0, 24) || "whiteboi",
      onboarded: true,
    });
    setVisible(false);
  };

  return (
    <section
      aria-label="Standing setup"
      className="mx-auto mb-4 max-w-2xl rounded-2xl border border-fuchsia-400/30 bg-[#120d18]/95 p-4 text-white shadow-xl"
    >
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">
            First-run standing · step {step} of 3
          </p>
          <h2 className="text-sm font-semibold text-zinc-100">
            {step === 1 && "Choose your default standing"}
            {step === 2 && "Choose her SPH intensity"}
            {step === 3 && "What she calls you"}
          </h2>
        </div>
        <button
          type="button"
          onClick={finish}
          className="rounded border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-400 hover:border-white/25 hover:text-white"
        >
          Skip
        </button>
      </header>

      {step === 1 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {STATUS_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              aria-pressed={status === card.id}
              onClick={() => setStatus(card.id)}
              className={`rounded-xl border p-3 text-left transition ${
                status === card.id
                  ? "border-fuchsia-400 bg-fuchsia-400/15 text-white"
                  : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/25"
              }`}
            >
              <div className="text-xs font-semibold">{card.label}</div>
              <div className="mt-0.5 text-[11px] text-zinc-400">{card.desc}</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {([1, 2, 3] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tier === t}
              onClick={() => setTier(t)}
              className={`rounded-xl border p-3 text-left transition ${
                tier === t
                  ? "border-fuchsia-400 bg-fuchsia-400/15 text-white"
                  : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/25"
              }`}
            >
              <div className="text-xs font-semibold">
                Tier {t} · {SPH_TIERS[t].label}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-400 line-clamp-2">{SPH_TIERS[t].directive}</div>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <label className="block space-y-1 text-xs text-zinc-300">
          <span>Default form of address</span>
          <input
            type="text"
            maxLength={24}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            aria-label="What she calls you"
            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-400"
          />
        </label>
      )}

      <footer className="mt-3 flex items-center justify-end gap-2">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:border-white/30"
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
            className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-400/20 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 hover:border-fuchsia-400"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="rounded-lg border border-fuchsia-400 bg-fuchsia-500/30 px-4 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-500/40"
          >
            Save standing
          </button>
        )}
      </footer>
    </section>
  );
}
