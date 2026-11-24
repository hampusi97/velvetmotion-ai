"use client";

import { useEffect, useMemo } from "react";
import { buildStatusDirective, daysSince, type KinkStatus, type UserStatus } from "@/data/kinkDoctrine";
import { useRelationship } from "@/components/useRelationship";

const LABELS: Record<UserStatus, string> = {
  pussyfree: "Pussyfree",
  released: "Recently released",
  cuckold: "Cuckold",
  chaste: "Locked",
  hotwife: "Hotwife",
  cheating: "Cheating",
};

export default function KinkStatusPanel({
  companionId,
  bullName,
  defaultStatus,
  defaultSphTier,
}: {
  companionId: string;
  bullName?: string;
  defaultStatus?: UserStatus;
  defaultSphTier?: 1 | 2 | 3;
}) {
  const rel = useRelationship(companionId);
  const { state, patch, setStatus, setSphTier } = rel;

  useEffect(() => {
    patch((prev) => ({
      ...prev,
      bullName: prev.bullName ?? bullName,
      status: prev.since ? prev.status : (defaultStatus ?? prev.status),
      sphTier: prev.since ? prev.sphTier : (defaultSphTier ?? prev.sphTier),
    }));
  }, [companionId, bullName, defaultStatus, defaultSphTier, patch]);

  const kinkView: KinkStatus = useMemo(
    () => ({
      status: state.status,
      sphTier: state.sphTier,
      since: state.since,
      bullName: state.bullName ?? bullName,
      note: state.note,
    }),
    [state.status, state.sphTier, state.since, state.bullName, state.note, bullName],
  );

  const days = daysSince(kinkView.since);
  const directive = useMemo(() => buildStatusDirective(kinkView), [kinkView]);

  return (
    <section className="rounded-xl border border-white/10 bg-black/40 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Standing</h3>
        {days > 0 && (
          <span className="font-mono text-xs text-fuchsia-300">
            {LABELS[kinkView.status]} · day {days}
          </span>
        )}
      </header>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(LABELS) as UserStatus[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatus(k)}
            aria-pressed={kinkView.status === k}
            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${
              kinkView.status === k
                ? "border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-200"
                : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
            }`}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">SPH</span>
        {([1, 2, 3] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSphTier(t)}
            aria-pressed={kinkView.sphTier === t}
            className={`h-6 w-6 rounded border text-[10px] ${
              kinkView.sphTier === t ? "border-fuchsia-400 text-fuchsia-200" : "border-white/10 text-zinc-500"
            }`}
          >
            {t}
          </button>
        ))}
        {kinkView.status === "pussyfree" && days > 0 && (
          <button
            type="button"
            onClick={() => setStatus("released")}
            className="ml-auto rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400 hover:border-white/25 hover:text-white"
          >
            Log release
          </button>
        )}
      </div>

      <details className="text-[11px] text-zinc-500">
        <summary className="cursor-pointer select-none hover:text-zinc-300">Injected directive</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-zinc-400">
          {directive}
        </pre>
      </details>
    </section>
  );
}
