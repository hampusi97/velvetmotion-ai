"use client";

import { useEffect, useState } from "react";
import type { CompanionProfile } from "@/data/companions";
import { KEYS } from "@/lib/storageKeys";
import { verifyPhoto, type Verdict } from "@/lib/verification";

export default function VerifyPanel({
  companion,
}: {
  companion: Pick<CompanionProfile, "id" | "name" | "personality">;
}) {
  const [claim, setClaim] = useState("pussyfree");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEYS.verify(companion.id));
      if (raw) setVerdict(JSON.parse(raw) as Verdict);
    } catch {
      /* */
    }
  }, [companion.id]);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!photoDataUrl || busy) return;
    setBusy(true);
    try {
      const res = await verifyPhoto(companion, photoDataUrl, claim.trim() || "pussyfree");
      setVerdict(res);
      try {
        window.localStorage.setItem(KEYS.verify(companion.id), JSON.stringify(res));
      } catch {
        /* */
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Verification</h3>
        {verdict && (
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
              verdict.pass === true
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : verdict.pass === false
                  ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                  : "border-white/15 text-zinc-400"
            }`}
          >
            {verdict.pass === true ? "PASS" : verdict.pass === false ? "FAIL" : "PENDING"}
          </span>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder="Claim (e.g. pussyfree)"
          aria-label="Verification claim"
          className="flex-1 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-white outline-none focus:border-fuchsia-400"
        />
        <label className="cursor-pointer rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-300 hover:border-white/30">
          {photoDataUrl ? "Photo ready" : "Choose photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled={!photoDataUrl || busy}
          onClick={() => void submit()}
          className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-400/15 px-3 py-1.5 text-[10px] uppercase tracking-wider text-fuchsia-200 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Submit"}
        </button>
      </div>

      {verdict && <p className="text-xs text-zinc-300">{verdict.line}</p>}
    </section>
  );
}
