'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_STATUS, buildStatusDirective, daysSince, type KinkStatus, type UserStatus } from '@/data/kinkDoctrine';

const KEY = (id: string) => `velvet:kink:${id}`;

const LABELS: Record<UserStatus, string> = {
  pussyfree: 'Pussyfree',
  released: 'Recently released',
  cuckold: 'Cuckold',
  chaste: 'Locked',
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
  const initialStatus: KinkStatus = {
    ...DEFAULT_STATUS,
    ...(defaultStatus ? { status: defaultStatus } : {}),
    ...(defaultSphTier ? { sphTier: defaultSphTier } : {}),
    bullName,
  };
  const [s, setS] = useState<KinkStatus>(initialStatus);

  useEffect(() => {
    const base: KinkStatus = {
      ...DEFAULT_STATUS,
      ...(defaultStatus ? { status: defaultStatus } : {}),
      ...(defaultSphTier ? { sphTier: defaultSphTier } : {}),
      bullName,
    };
    try {
      const raw = localStorage.getItem(KEY(companionId));
      if (raw) {
        setS({ ...base, ...(JSON.parse(raw) as Partial<KinkStatus>) });
      } else {
        setS(base);
      }
    } catch {
      setS(base);
    }
  }, [companionId, bullName, defaultStatus, defaultSphTier]);

  const save = (next: KinkStatus) => {
    setS(next);
    try {
      localStorage.setItem(KEY(companionId), JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  const days = daysSince(s.since);
  const directive = useMemo(() => buildStatusDirective(s), [s]);

  return (
    <section className="rounded-xl border border-white/10 bg-black/40 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Standing</h3>
        {days > 0 && (
          <span className="font-mono text-xs text-fuchsia-300">
            {LABELS[s.status]} · day {days}
          </span>
        )}
      </header>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(LABELS) as UserStatus[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => save({ ...s, status: k, since: new Date().toISOString() })}
            aria-pressed={s.status === k}
            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${
              s.status === k
                ? 'border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-200'
                : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300'
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
            onClick={() => save({ ...s, sphTier: t })}
            aria-pressed={s.sphTier === t}
            className={`h-6 w-6 rounded border text-[10px] ${
              s.sphTier === t ? 'border-fuchsia-400 text-fuchsia-200' : 'border-white/10 text-zinc-500'
            }`}
          >
            {t}
          </button>
        ))}
        {s.status === 'pussyfree' && days > 0 && (
          <button
            type="button"
            onClick={() => save({ ...s, status: 'released', since: new Date().toISOString() })}
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
